from datetime import timedelta
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

from .filters import TrackFilter
from .models import Track
from .permissions import IsAppAdmin, IsArtist
from .serializers import TrackDetailSerializer, TrackListSerializer, TrackUploadSerializer

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
            .filter(status="approved")
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

    def get(self, request, pk):
        try:
            track = Track.objects.get(pk=pk, status="approved")
        except Track.DoesNotExist:
            raise Http404("Track not found")

        # Log play history
        PlayHistory.objects.create(
            user=request.user,
            track=track
        )

        response = FileResponse(track.audio_file.open("rb"), content_type="audio/mpeg")
        response["Content-Disposition"] = f'inline; filename="{track.title}.mp3"'
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

        return Response({"detail": "Track rejected."})
class PopularTracksView(generics.ListAPIView):
    serializer_class = TrackListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return (
            Track.objects
            .filter(status="approved")
            .annotate(play_count=Count("plays"))
            .order_by("-play_count")
            .select_related("artist", "genre")
        )

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
        last_7_days = timezone.now() - timedelta(days=7)

        return (
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