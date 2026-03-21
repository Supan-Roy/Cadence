from datetime import timedelta
from django.core.cache import cache
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Count, Max, Q
from django.http import FileResponse, Http404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from interactions.models import PlayHistory
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
import os
from django.http import HttpResponse
from .throttles import StreamThrottle
from .filters import TrackFilter
from .models import Genre, Track
from .permissions import IsAppAdmin, IsArtist
from .serializers import GenreSerializer, TrackDetailSerializer, TrackListSerializer, TrackUploadSerializer

POPULAR_CACHE_KEY = "popular_tracks"
TRENDING_CACHE_KEY = "trending_tracks"

class TrackUploadView(generics.CreateAPIView):
    queryset = Track.objects.all()
    serializer_class = TrackUploadSerializer
    permission_classes = [IsAuthenticated, IsArtist]

class ApprovedTrackListView(generics.ListAPIView):
    serializer_class = TrackListSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = TrackFilter

    search_fields = ["title", "description"]
    ordering_fields = ["release_date"]
    ordering = ["-release_date"]

    def get_queryset(self):
        return (
            Track.objects
            .filter(status="approved", is_podcast=False)
            .annotate(play_count=Count("plays"))
            .select_related("artist", "genre")
        )

class TrackDetailView(generics.RetrieveAPIView):
    serializer_class = TrackDetailSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Track.objects.filter(status="approved").select_related("artist", "genre")
class TrackStreamView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [StreamThrottle]
    
    def get(self, request, pk):
        try:
            track = Track.objects.get(pk=pk, status="approved")
        except Track.DoesNotExist:
            raise Http404("Track not found")

        file_path = track.audio_file.path
        file_size = os.path.getsize(file_path)

        range_header = request.headers.get("Range", None)

        if range_header:
            range_value = range_header.replace("bytes=", "")
            start, end = range_value.split("-")

            start = int(start)
            end = int(end) if end else file_size - 1

            length = end - start + 1

            with open(file_path, "rb") as f:
                f.seek(start)
                data = f.read(length)

            response = HttpResponse(data, status=206, content_type="audio/mpeg")
            response["Content-Range"] = f"bytes {start}-{end}/{file_size}"
            response["Accept-Ranges"] = "bytes"
            response["Content-Length"] = str(length)

        else:
            with open(file_path, "rb") as f:
                data = f.read()

            response = HttpResponse(data, content_type="audio/mpeg")
            response["Content-Length"] = str(file_size)

        # Log play
        PlayHistory.objects.create(user=request.user, track=track)

        # Cache invalidation
        cache.delete(POPULAR_CACHE_KEY)
        cache.delete(TRENDING_CACHE_KEY)

        return response
class PendingTrackListView(generics.ListAPIView):
    serializer_class = TrackDetailSerializer
    permission_classes = [IsAuthenticated, IsAppAdmin]

    def get_queryset(self):
        return Track.objects.filter(status="pending").select_related("artist", "genre")

class ApproveTrackView(APIView):
    permission_classes = [IsAuthenticated, IsAppAdmin]

    def post(self, request, pk):
        try:
            track = Track.objects.get(pk=pk, status="pending")
        except Track.DoesNotExist:
            return Response(
                {"detail": "Track not found or already reviewed."},
                status=status.HTTP_404_NOT_FOUND
            )

        track.status = "approved"
        track.reviewed_by = request.user
        track.rejection_reason = ""
        track.save()

        cache.delete(POPULAR_CACHE_KEY)
        cache.delete(TRENDING_CACHE_KEY)

        return Response({"detail": "Track approved."})

class RejectTrackView(APIView):
    permission_classes = [IsAuthenticated, IsAppAdmin]

    def post(self, request, pk):
        reason = request.data.get("reason")

        if not reason:
            return Response(
                {"detail": "Rejection reason required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            track = Track.objects.get(pk=pk, status="pending")
        except Track.DoesNotExist:
            return Response(
                {"detail": "Track not found or already reviewed."},
                status=status.HTTP_404_NOT_FOUND
            )

        track.status = "rejected"
        track.reviewed_by = request.user
        track.rejection_reason = reason
        track.save()

        cache.delete(POPULAR_CACHE_KEY)
        cache.delete(TRENDING_CACHE_KEY)

        return Response({"detail": "Track rejected."})
class PopularTracksView(generics.ListAPIView):
    serializer_class = TrackListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        cached_data = cache.get(POPULAR_CACHE_KEY)
        if cached_data:
            print(f"[CACHE HIT] {POPULAR_CACHE_KEY}")
            return cached_data

        queryset = (
            Track.objects
            .filter(status="approved")
            .annotate(play_count=Count("plays"))
            .order_by("-play_count")
            .select_related("artist", "genre")
        )

        cache.set(POPULAR_CACHE_KEY, queryset, timeout=60)

        return queryset

class RecentlyPlayedView(generics.ListAPIView):
    serializer_class = TrackListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Track.objects
            .filter(plays__user=self.request.user, status="approved")
            .annotate(last_played=Max("plays__played_at"))
            .order_by("-last_played")
            .select_related("artist", "genre")
            .distinct()
        )
    
class TrendingTracksView(generics.ListAPIView):
    serializer_class = TrackListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        cached_data = cache.get(TRENDING_CACHE_KEY)
        if cached_data:
            print(f"[CACHE HIT] {TRENDING_CACHE_KEY}")
            return cached_data

        last_7_days = timezone.now() - timedelta(days=7)

        queryset = (
            Track.objects
            .filter(status="approved")
            .annotate(
                recent_plays=Count(
                    "plays",
                    filter=Q(plays__played_at__gte=last_7_days)
                )
            )
            .order_by("-recent_plays")
            .select_related("artist", "genre")
        )

        cache.set(TRENDING_CACHE_KEY, queryset, timeout=60)

        return queryset
    
class RecommendedTracksView(generics.ListAPIView):
    serializer_class = TrackListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        # Get user's most listened genres
        top_genres = (
            PlayHistory.objects
            .filter(user=user)
            .values("track__genre")
            .annotate(count=Count("id"))
            .order_by("-count")[:3]
        )

        genre_ids = [item["track__genre"] for item in top_genres]

        # Get tracks user already played
        played_tracks = PlayHistory.objects.filter(user=user).values_list("track_id", flat=True)

        # Recommend tracks from those genres
        return (
            Track.objects
            .filter(status="approved", genre_id__in=genre_ids)
            .exclude(id__in=played_tracks)
            .annotate(play_count=Count("plays"))
            .order_by("-play_count")
            .select_related("artist", "genre")
        )
    
class PodcastListView(generics.ListAPIView):
    serializer_class = TrackListSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = TrackFilter

    search_fields = ["title", "description"]
    ordering_fields = ["release_date"]
    ordering = ["-release_date"]

    def get_queryset(self):
        return (
            Track.objects
            .filter(status="approved", is_podcast=True)
            .annotate(play_count=Count("plays"))
            .select_related("artist", "genre")
        )


class GenreListView(generics.ListAPIView):
    serializer_class = GenreSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        is_podcast = self.request.query_params.get("is_podcast")

        if is_podcast is None:
            return Genre.objects.all().order_by("name")

        normalized = is_podcast.strip().lower()
        podcast_selected = normalized in ["1", "true", "yes"]
        category = Genre.CATEGORY_PODCAST if podcast_selected else Genre.CATEGORY_MUSIC

        return Genre.objects.filter(category=category).order_by("name")
    
