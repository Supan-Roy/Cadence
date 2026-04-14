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
from django.contrib.auth import get_user_model
import io
from datetime import datetime, date
import re
import json
from urllib.parse import urlencode, quote
from urllib.request import Request, urlopen
try:
    from mutagen import File as MutagenFile
    from mutagen.id3 import ID3, ID3NoHeaderError
    from mutagen.flac import FLAC
    from mutagen.mp4 import MP4
except ImportError:  # pragma: no cover
    MutagenFile = None
    ID3 = None
    ID3NoHeaderError = Exception
    FLAC = None
    MP4 = None
from rest_framework.parsers import MultiPartParser, FormParser
from .throttles import StreamThrottle
from .filters import TrackFilter
from .models import Genre, Track
from .permissions import IsAppAdmin, IsArtist
from .serializers import (
    GenreSerializer,
    TrackDetailSerializer,
    TrackListSerializer,
    TrackUploadSerializer,
    UploaderTrackSerializer,
    UploaderTrackUpdateSerializer,
)

User = get_user_model()

POPULAR_CACHE_KEY = "popular_tracks"
TRENDING_CACHE_KEY = "trending_tracks"
MAX_SEARCH_QUERY_LENGTH = 40


def _resolve_artist_name(track):
    featured = (getattr(track, "featured_artists", "") or "").strip()
    if featured:
        return featured

    artist_name = (getattr(track.artist, "name", "") or "").strip()
    if artist_name and artist_name != "User":
        return artist_name

    artist_email = getattr(track.artist, "email", "") or ""
    if artist_email and "@" in artist_email:
        return artist_email.split("@")[0]

    return artist_name or artist_email or "Unknown Artist"


class LatestReleaseNotificationsView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = []

    def get(self, request):
        try:
            limit = int(request.query_params.get("limit", 10))
        except (TypeError, ValueError):
            limit = 10
        limit = max(1, min(limit, 25))

        # Pull extra rows from each source and merge by recency.
        fetch_size = limit * 3

        singles = (
            Track.objects
            .filter(status="approved", is_podcast=False, song_type="single")
            .select_related("artist")
            .order_by("-created_at")[:fetch_size]
        )

        podcasts = (
            Track.objects
            .filter(status="approved", is_podcast=True)
            .select_related("artist")
            .order_by("-created_at")[:fetch_size]
        )

        album_tracks = (
            Track.objects
            .filter(status="approved", is_podcast=False, song_type__in=["album", "ep"])
            .exclude(album_name="")
            .select_related("artist")
            .order_by("-created_at")[:fetch_size]
        )

        notifications = []

        for track in singles:
            artist_name = _resolve_artist_name(track)
            notifications.append(
                {
                    "id": f"single:{track.id}",
                    "type": "single",
                    "artist_name": artist_name,
                    "release_name": track.title,
                    "message": f"{artist_name} released {track.title}",
                    "artist_image": track.artist.profile_image.url if track.artist.profile_image else None,
                    "cover_image": track.cover_image.url if track.cover_image else None,
                    "created_at": track.created_at,
                    "target_type": "track",
                    "target_track_id": str(track.id),
                    "target_album_name": None,
                }
            )

        for track in podcasts:
            artist_name = _resolve_artist_name(track)
            notifications.append(
                {
                    "id": f"podcast:{track.id}",
                    "type": "podcast",
                    "artist_name": artist_name,
                    "release_name": track.title,
                    "message": f"{artist_name} released new podcast {track.title}",
                    "artist_image": track.artist.profile_image.url if track.artist.profile_image else None,
                    "cover_image": track.cover_image.url if track.cover_image else None,
                    "created_at": track.created_at,
                    "target_type": "track",
                    "target_track_id": str(track.id),
                    "target_album_name": None,
                }
            )

        seen_albums = set()
        for track in album_tracks:
            album_name = (track.album_name or "").strip()
            if not album_name:
                continue

            album_key = f"{track.artist_id}:{album_name.lower()}"
            if album_key in seen_albums:
                continue

            seen_albums.add(album_key)
            artist_name = _resolve_artist_name(track)
            notifications.append(
                {
                    "id": f"album:{track.artist_id}:{album_name.lower()}",
                    "type": "album",
                    "artist_name": artist_name,
                    "release_name": album_name,
                    "message": f"{artist_name} released album {album_name}",
                    "artist_image": track.artist.profile_image.url if track.artist.profile_image else None,
                    "cover_image": track.cover_image.url if track.cover_image else None,
                    "created_at": track.created_at,
                    "target_type": "album",
                    "target_track_id": None,
                    "target_album_name": album_name,
                }
            )

        notifications = sorted(notifications, key=lambda item: item["created_at"], reverse=True)[:limit]

        data = [
            {
                **item,
                "created_at": item["created_at"].isoformat(),
            }
            for item in notifications
        ]

        return Response(data)

class TrackUploadView(generics.CreateAPIView):
    queryset = Track.objects.all()
    serializer_class = TrackUploadSerializer
    permission_classes = [IsAuthenticated, IsArtist]
    throttle_classes = []


class UploadMetadataPreviewView(APIView):
    permission_classes = [IsAuthenticated, IsArtist]
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = []

    def _parse_release_date(self, raw_value):
        if not raw_value:
            return None

        value = str(raw_value).strip()
        if not value:
            return None

        for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y", "%d/%m/%Y"]:
            try:
                return datetime.strptime(value, fmt).date()
            except ValueError:
                continue

        year_match = re.search(r"\b(19|20)\d{2}\b", value)
        if year_match:
            try:
                return date(int(year_match.group(0)), 1, 1)
            except ValueError:
                return None

        return None

    def post(self, request):
        audio_file = request.FILES.get("audio_file")
        if not audio_file:
            return Response({"detail": "audio_file is required."}, status=status.HTTP_400_BAD_REQUEST)

        if MutagenFile is None:
            return Response(
                {
                    "featured_artists": "",
                    "album_name": "",
                    "release_date": None,
                    "has_embedded_cover": False,
                }
            )

        try:
            audio_file.seek(0)
            raw_audio = audio_file.read()
            audio_file.seek(0)

            if not raw_audio:
                return Response(
                    {
                        "featured_artists": "",
                        "album_name": "",
                        "release_date": None,
                        "has_embedded_cover": False,
                    }
                )

            parsed_easy = MutagenFile(io.BytesIO(raw_audio), easy=True)
            tags = parsed_easy.tags if parsed_easy and getattr(parsed_easy, "tags", None) else {}

            def pick_first(keys):
                for key in keys:
                    values = tags.get(key) if tags else None
                    if values:
                        first = values[0]
                        if first is not None and str(first).strip():
                            return str(first).strip()
                return ""

            featured_artists = pick_first(["artist", "albumartist", "performer", "composer"])
            title = pick_first(["title"])
            album_name = pick_first(["album"])
            raw_date = pick_first(["date", "originaldate", "year"])
            release_date = self._parse_release_date(raw_date)

            has_embedded_cover = False

            if ID3 is not None:
                try:
                    id3 = ID3(io.BytesIO(raw_audio))
                    has_embedded_cover = bool(id3.getall("APIC"))
                except ID3NoHeaderError:
                    pass

            if not has_embedded_cover:
                parsed_full = MutagenFile(io.BytesIO(raw_audio))
                if isinstance(parsed_full, MP4):
                    covr = parsed_full.tags.get("covr") if parsed_full.tags else None
                    has_embedded_cover = bool(covr)
                elif isinstance(parsed_full, FLAC):
                    has_embedded_cover = bool(parsed_full.pictures)

            return Response(
                {
                    "title": title,
                    "featured_artists": featured_artists,
                    "album_artist": pick_first(["albumartist", "album artist"]),
                    "album_name": album_name,
                    "release_date": release_date.isoformat() if release_date else None,
                    "has_embedded_cover": has_embedded_cover,
                }
            )
        except Exception:
            return Response(
                {
                    "title": "",
                    "featured_artists": "",
                    "album_artist": "",
                    "album_name": "",
                    "release_date": None,
                    "has_embedded_cover": False,
                }
            )


class MyUploadsListView(generics.ListAPIView):
    serializer_class = UploaderTrackSerializer
    permission_classes = [IsAuthenticated, IsArtist]
    throttle_classes = []

    def get_queryset(self):
        return (
            Track.objects
            .filter(artist=self.request.user)
            .select_related("genre")
            .prefetch_related("renditions")
            .order_by("-created_at")
        )


class MyUploadUpdateView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UploaderTrackUpdateSerializer
    permission_classes = [IsAuthenticated, IsArtist]
    throttle_classes = []

    def get_queryset(self):
        return (
            Track.objects
            .filter(artist=self.request.user)
            .select_related("genre")
            .prefetch_related("renditions")
        )

    def perform_update(self, serializer):
        serializer.save()
        cache.delete(POPULAR_CACHE_KEY)
        cache.delete(TRENDING_CACHE_KEY)

    def perform_destroy(self, instance):
        instance.delete()
        cache.delete(POPULAR_CACHE_KEY)
        cache.delete(TRENDING_CACHE_KEY)

class ApprovedTrackListView(generics.ListAPIView):
    serializer_class = TrackListSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = TrackFilter

    search_fields = ["title", "description", "album_name", "featured_artists", "artist__name", "artist__email"]
    ordering_fields = ["release_date"]
    ordering = ["-release_date"]

    def list(self, request, *args, **kwargs):
        search_query = request.query_params.get("search", "")
        if len(search_query) > MAX_SEARCH_QUERY_LENGTH:
            return Response(
                {"detail": f"Search query must be at most {MAX_SEARCH_QUERY_LENGTH} characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        return (
            Track.objects
            .filter(status="approved", is_podcast=False)
            .annotate(play_count=Count("plays"))
            .select_related("artist", "genre")
            .prefetch_related("renditions")
        )

class TrackDetailView(generics.RetrieveAPIView):
    serializer_class = TrackDetailSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return (
            Track.objects
            .filter(status="approved")
            .select_related("artist", "genre")
            .prefetch_related("renditions")
        )
class TrackStreamView(APIView):
    permission_classes = [AllowAny]  # Changed from IsAuthenticated to allow seeking
    throttle_classes = [StreamThrottle]
    
    def get(self, request, pk):
        try:
            track = Track.objects.get(pk=pk, status="approved")
        except Track.DoesNotExist:
            raise Http404("Track not found")

        requested_bitrate = request.query_params.get("bitrate")
        selected_file = track.audio_file
        if requested_bitrate:
            try:
                bitrate_value = int(requested_bitrate)
            except (TypeError, ValueError):
                bitrate_value = None

            if bitrate_value:
                rendition = (
                    track.renditions
                    .filter(bitrate=bitrate_value, audio_file__isnull=False)
                    .order_by("-updated_at")
                    .first()
                )
                if rendition and rendition.audio_file:
                    selected_file = rendition.audio_file

        file_path = selected_file.path
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
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Methods"] = "GET, HEAD, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type, Range"

        else:
            with open(file_path, "rb") as f:
                data = f.read()

            response = HttpResponse(data, content_type="audio/mpeg")
            response["Content-Length"] = str(file_size)
            response["Accept-Ranges"] = "bytes"
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Methods"] = "GET, HEAD, OPTIONS"

        # Log play if user is authenticated
        if request.user.is_authenticated:
            PlayHistory.objects.create(user=request.user, track=track)

            # Cache invalidation
            cache.delete(POPULAR_CACHE_KEY)
            cache.delete(TRENDING_CACHE_KEY)

        return response
class PendingTrackListView(generics.ListAPIView):
    serializer_class = TrackDetailSerializer
    permission_classes = [IsAuthenticated, IsAppAdmin]

    def get_queryset(self):
        return (
            Track.objects
            .filter(status="pending")
            .select_related("artist", "genre")
            .prefetch_related("renditions")
        )

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
    throttle_classes = []

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
    throttle_classes = []

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
    throttle_classes = []
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = TrackFilter

    search_fields = ["title", "description", "album_name", "featured_artists", "artist__name", "artist__email"]
    ordering_fields = ["release_date"]
    ordering = ["-release_date"]

    def list(self, request, *args, **kwargs):
        search_query = request.query_params.get("search", "")
        if len(search_query) > MAX_SEARCH_QUERY_LENGTH:
            return Response(
                {"detail": f"Search query must be at most {MAX_SEARCH_QUERY_LENGTH} characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().list(request, *args, **kwargs)

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


class ArtistSuggestionView(APIView):
    permission_classes = [IsAuthenticated, IsArtist]
    throttle_classes = []

    def get(self, request):
        query = request.query_params.get("q", "").strip().lower()
        suggestions = set()

        users = User.objects.all().only("email", "name")
        for user in users:
            if user.name and user.name.strip() and user.name != "User":
                suggestions.add(user.name.strip())
            if user.email and "@" in user.email:
                suggestions.add(user.email.split("@")[0].strip())

        featured_values = Track.objects.exclude(featured_artists="").values_list("featured_artists", flat=True)
        for featured in featured_values:
            for name in featured.split(","):
                clean = name.strip()
                if clean:
                    suggestions.add(clean)

        if query:
            filtered = [name for name in suggestions if query in name.lower()]
        else:
            filtered = list(suggestions)

        filtered.sort(key=lambda value: value.lower())
        return Response(filtered[:20])


class AlbumSuggestionView(APIView):
    permission_classes = [IsAuthenticated, IsArtist]
    throttle_classes = []

    def get(self, request):
        query = request.query_params.get("q", "").strip().lower()

        album_values = (
            Track.objects
            .exclude(album_name="")
            .values_list("album_name", flat=True)
            .distinct()
        )

        if query:
            filtered = [name for name in album_values if query in name.lower()]
        else:
            filtered = list(album_values)

        filtered = sorted(set(filtered), key=lambda value: value.lower())
        return Response(filtered[:20])


class CurrentTrackLyricsView(APIView):
    permission_classes = [AllowAny]

    def _normalize_title(self, title):
        normalized = title or ""
        normalized = re.sub(r"\s*\([^)]*(official|video|audio|lyric|lyrics)[^)]*\)", "", normalized, flags=re.IGNORECASE)
        normalized = re.sub(r"\s*\[[^\]]*(official|video|audio|lyric|lyrics)[^\]]*\]", "", normalized, flags=re.IGNORECASE)
        normalized = re.split(r"\s+-\s+(remaster|remix|live|acoustic).*", normalized, flags=re.IGNORECASE)[0]
        normalized = re.sub(r"\s+", " ", normalized).strip()
        return normalized

    def _fetch_json(self, url):
        request = Request(
            url,
            headers={
                "User-Agent": "CadenceLyrics/1.0",
                "Accept": "application/json",
            },
        )
        with urlopen(request, timeout=6) as response:
            payload = response.read().decode("utf-8", errors="ignore")
            return json.loads(payload)

    def _fetch_from_lrclib(self, title, artist):
        params = urlencode({
            "track_name": title,
            "artist_name": artist,
        })
        data = self._fetch_json(f"https://lrclib.net/api/get?{params}")

        plain_lyrics = (data.get("plainLyrics") or "").strip()
        if plain_lyrics:
            return {
                "lyrics": plain_lyrics,
                "source": "lrclib",
            }
        return None

    def _fetch_from_lyrics_ovh(self, title, artist):
        encoded_artist = quote(artist, safe="")
        encoded_title = quote(title, safe="")
        data = self._fetch_json(f"https://api.lyrics.ovh/v1/{encoded_artist}/{encoded_title}")

        lyrics = (data.get("lyrics") or "").strip()
        if lyrics:
            return {
                "lyrics": lyrics,
                "source": "lyrics.ovh",
            }
        return None

    def get(self, request):
        raw_title = request.query_params.get("title", "").strip()
        raw_artist = request.query_params.get("artist", "").strip()

        if not raw_title or not raw_artist:
            return Response(
                {"detail": "title and artist query params are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        title = self._normalize_title(raw_title)
        artist = raw_artist.split(",")[0].strip()

        providers = [self._fetch_from_lrclib, self._fetch_from_lyrics_ovh]
        for provider in providers:
            try:
                result = provider(title, artist)
                if result:
                    return Response(
                        {
                            "title": raw_title,
                            "artist": raw_artist,
                            "recommended_language": "en",
                            "lyrics": result["lyrics"],
                            "source": result["source"],
                        }
                    )
            except Exception:
                continue

        return Response(
            {
                "title": raw_title,
                "artist": raw_artist,
                "recommended_language": "en",
                "lyrics": "",
                "source": None,
                "detail": "No lyrics found for this song.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )
    
