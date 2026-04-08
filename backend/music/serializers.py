from rest_framework import serializers
from django.core.files.base import ContentFile
from django.db.models import Max
import uuid
import io
from datetime import date, datetime
import re

try:
    from mutagen import File as MutagenFile
    from mutagen.id3 import ID3, ID3NoHeaderError
    from mutagen.flac import FLAC
    from mutagen.mp4 import MP4, MP4Cover
except ImportError:  # pragma: no cover
    MutagenFile = None
    ID3 = None
    ID3NoHeaderError = Exception
    FLAC = None
    MP4 = None
    MP4Cover = None
from .models import Genre, Track, TrackRendition
from .tasks import process_track_adaptive_bitrates


class TrackUploadSerializer(serializers.ModelSerializer):
    cover_image = serializers.ImageField(required=False, allow_null=True)
    release_date = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = Track
        read_only_fields = ["artist"]
        exclude = [
            "status",
            "reviewed_by",
            "rejection_reason",
            "duration",
            "bitrate",
            "file_size",
            "created_at",
            "updated_at",
        ]

    def _extract_embedded_cover(self, audio_file):
        if MutagenFile is None:
            return None

        if not audio_file:
            return None

        try:
            audio_file.seek(0)
            raw_audio = audio_file.read()
            audio_file.seek(0)

            if not raw_audio:
                return None

            parsed = MutagenFile(io.BytesIO(raw_audio))
            if not parsed:
                parsed = None

            image_bytes = None
            ext = "jpg"

            # MP3 ID3/APIC fallback works for many tagged files where generic parsing misses artwork.
            if ID3 is not None:
                try:
                    id3 = ID3(io.BytesIO(raw_audio))
                    apic_frames = id3.getall("APIC")
                    if apic_frames:
                        frame = apic_frames[0]
                        image_bytes = frame.data
                        mime = (frame.mime or "").lower()
                        if "png" in mime:
                            ext = "png"
                        elif "gif" in mime:
                            ext = "gif"
                        else:
                            ext = "jpg"
                except ID3NoHeaderError:
                    pass

            if image_bytes is None and parsed is not None and hasattr(parsed, "tags") and parsed.tags:
                # MP3 (ID3 APIC)
                if hasattr(parsed.tags, "getall"):
                    apic_frames = parsed.tags.getall("APIC")
                    if apic_frames:
                        frame = apic_frames[0]
                        image_bytes = frame.data
                        mime = (frame.mime or "").lower()
                        if "png" in mime:
                            ext = "png"
                        elif "gif" in mime:
                            ext = "gif"
                        else:
                            ext = "jpg"

                # MP4/M4A cover atoms
                if image_bytes is None and isinstance(parsed, MP4):
                    covr = parsed.tags.get("covr") if parsed.tags else None
                    if covr:
                        first = covr[0]
                        image_bytes = bytes(first)
                        if isinstance(first, MP4Cover) and first.imageformat == MP4Cover.FORMAT_PNG:
                            ext = "png"
                        else:
                            ext = "jpg"

                # FLAC pictures
                if image_bytes is None and isinstance(parsed, FLAC) and parsed.pictures:
                    picture = parsed.pictures[0]
                    image_bytes = picture.data
                    mime = (picture.mime or "").lower()
                    if "png" in mime:
                        ext = "png"
                    elif "gif" in mime:
                        ext = "gif"
                    else:
                        ext = "jpg"

            if not image_bytes:
                return None

            return ContentFile(image_bytes, name=f"embedded-cover-{uuid.uuid4()}.{ext}")
        except Exception:
            try:
                audio_file.seek(0)
            except Exception:
                pass
            return None

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

    def _extract_embedded_metadata(self, audio_file):
        if MutagenFile is None or not audio_file:
            return {}

        try:
            audio_file.seek(0)
            raw_audio = audio_file.read()
            audio_file.seek(0)

            if not raw_audio:
                return {}

            parsed = MutagenFile(io.BytesIO(raw_audio), easy=True)
            if not parsed or not getattr(parsed, "tags", None):
                return {}

            tags = parsed.tags

            def pick_first(keys):
                for key in keys:
                    values = tags.get(key)
                    if values:
                        first = values[0]
                        if first is not None and str(first).strip():
                            return str(first).strip()
                return ""

            metadata = {
                "title": pick_first(["title"]),
                "featured_artists": pick_first(["artist", "albumartist", "performer", "composer"]),
                "album_artist": pick_first(["albumartist", "album artist"]),
                "album_name": pick_first(["album"]),
            }

            raw_date = pick_first(["date", "originaldate", "year"])
            parsed_date = self._parse_release_date(raw_date)
            if parsed_date:
                metadata["release_date"] = parsed_date

            return metadata
        except Exception:
            try:
                audio_file.seek(0)
            except Exception:
                pass
            return {}

    def create(self, validated_data):
        request_user = self.context["request"].user
        validated_data["artist"] = request_user
        validated_data["status"] = "approved" if getattr(request_user, "role", "") == "admin" else "pending"

        song_type = validated_data.get("song_type", "single")
        album_name = (validated_data.get("album_name") or "").strip()
        album_track_order = validated_data.get("album_track_order", None)

        if song_type in ["album", "ep"] and album_name and album_track_order in [None, ""]:
            max_order = (
                Track.objects
                .filter(
                    artist=request_user,
                    song_type__in=["album", "ep"],
                    album_name__iexact=album_name,
                )
                .aggregate(max_order=Max("album_track_order"))
                .get("max_order")
            )
            validated_data["album_track_order"] = (max_order or 0) + 1

        track = super().create(validated_data)

        if track.adaptive_bitrate and not track.is_podcast:
            process_track_adaptive_bitrates.delay(str(track.id))

        return track

    def validate(self, attrs):
        genre = attrs.get("genre")
        is_podcast = attrs.get("is_podcast", False)
        lyrics_file = attrs.get("lyrics_file")
        lyrics_text = attrs.get("lyrics_text", "")
        cover_image = attrs.get("cover_image")
        audio_file = attrs.get("audio_file")
        embedded_metadata = self._extract_embedded_metadata(audio_file)

        if not attrs.get("featured_artists") and embedded_metadata.get("featured_artists"):
            attrs["featured_artists"] = embedded_metadata["featured_artists"]

        if not attrs.get("album_artist") and embedded_metadata.get("album_artist"):
            attrs["album_artist"] = embedded_metadata["album_artist"]

        if not attrs.get("album_name") and embedded_metadata.get("album_name"):
            attrs["album_name"] = embedded_metadata["album_name"]

        if not attrs.get("release_date") and embedded_metadata.get("release_date"):
            attrs["release_date"] = embedded_metadata["release_date"]

        if not attrs.get("release_date"):
            raise serializers.ValidationError(
                {"release_date": "Release date is required if no embedded date metadata is found in the audio file."}
            )

        if not cover_image:
            embedded_cover = self._extract_embedded_cover(audio_file)
            if embedded_cover:
                attrs["cover_image"] = embedded_cover
            else:
                raise serializers.ValidationError(
                    {"cover_image": "Cover image is required if no embedded artwork is found in the audio file."}
                )

        if genre is None:
            return attrs

        expected_category = Genre.CATEGORY_PODCAST if is_podcast else Genre.CATEGORY_MUSIC
        if genre.category != expected_category:
            expected_label = "podcast" if is_podcast else "music"
            raise serializers.ValidationError(
                {"genre": f"Selected genre must be a {expected_label} genre."}
            )

        if is_podcast and attrs.get("adaptive_bitrate"):
            attrs["adaptive_bitrate"] = False

        if lyrics_file:
            filename = lyrics_file.name.lower()
            if not filename.endswith(".lrc"):
                raise serializers.ValidationError({"lyrics_file": "Lyrics file must be an .lrc file."})

        if lyrics_text and len(lyrics_text) > 20000:
            raise serializers.ValidationError({"lyrics_text": "Lyrics text is too long."})

        return attrs


class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ["id", "name", "category"]

class TrackListSerializer(serializers.ModelSerializer):
    artist_name = serializers.SerializerMethodField()
    renditions = serializers.SerializerMethodField()
    default_stream_url = serializers.SerializerMethodField()

    def get_artist_name(self, obj):
        # Prefer artist names explicitly provided during upload/edit.
        featured = getattr(obj, "featured_artists", "") or ""
        featured = featured.strip()
        if featured:
            return featured

        artist_name = getattr(obj.artist, "name", "") or ""
        if artist_name and artist_name.strip() and artist_name != "User":
            return artist_name

        artist_email = getattr(obj.artist, "email", "") or ""
        if artist_email and "@" in artist_email:
            return artist_email.split("@")[0]

        return artist_name or artist_email or "Unknown Artist"

    def get_renditions(self, obj):
        rows = getattr(obj, "renditions", None)
        queryset = rows.all() if rows is not None else TrackRendition.objects.filter(track=obj)
        return [
            {
                "bitrate": item.bitrate,
                "url": item.audio_file.url if item.audio_file else None,
                "is_source": item.is_source,
            }
            for item in queryset.order_by("bitrate")
            if item.audio_file
        ]

    def get_default_stream_url(self, obj):
        preferred = obj.renditions.filter(bitrate=256, audio_file__isnull=False).first()
        if preferred and preferred.audio_file:
            return preferred.audio_file.url
        highest = obj.renditions.filter(audio_file__isnull=False).order_by("-bitrate").first()
        if highest and highest.audio_file:
            return highest.audio_file.url
        return obj.audio_file.url if obj.audio_file else None

    class Meta:
        model = Track
        fields = [
            "id",
            "title",
            "description",
            "artist_name",
            "album_name",
            "album_artist",
            "album_cover_image",
            "album_track_order",
            "genre",
            "release_date",
            "language",
            "song_type",
            "is_podcast",
            "explicit",
            "featured_artists",
            "duration",
            "cover_image",
            "audio_file",
            "renditions",
            "default_stream_url",
        ]

class TrackDetailSerializer(serializers.ModelSerializer):
    artist_name = serializers.SerializerMethodField()
    genre_name = serializers.SerializerMethodField()
    renditions = serializers.SerializerMethodField()
    default_stream_url = serializers.SerializerMethodField()

    def get_artist_name(self, obj):
        # Prefer artist names explicitly provided during upload/edit.
        featured = getattr(obj, "featured_artists", "") or ""
        featured = featured.strip()
        if featured:
            return featured

        artist_name = getattr(obj.artist, "name", "") or ""
        if artist_name and artist_name.strip() and artist_name != "User":
            return artist_name

        artist_email = getattr(obj.artist, "email", "") or ""
        if artist_email and "@" in artist_email:
            return artist_email.split("@")[0]

        return artist_name or artist_email or "Unknown Artist"

    def get_genre_name(self, obj):
        return obj.genre.name if obj.genre else None

    def get_renditions(self, obj):
        return [
            {
                "bitrate": item.bitrate,
                "url": item.audio_file.url if item.audio_file else None,
                "is_source": item.is_source,
            }
            for item in obj.renditions.order_by("bitrate")
            if item.audio_file
        ]

    def get_default_stream_url(self, obj):
        preferred = obj.renditions.filter(bitrate=256, audio_file__isnull=False).first()
        if preferred and preferred.audio_file:
            return preferred.audio_file.url
        highest = obj.renditions.filter(audio_file__isnull=False).order_by("-bitrate").first()
        if highest and highest.audio_file:
            return highest.audio_file.url
        return obj.audio_file.url if obj.audio_file else None

    class Meta:
        model = Track
        fields = [
            "id",
            "title",
            "description",
            "artist_name",
            "album_name",
            "album_artist",
            "album_cover_image",
            "album_track_order",
            "genre_name",
            "release_date",
            "language",
            "song_type",
            "is_podcast",
            "explicit",
            "featured_artists",
            "lyrics_text",
            "lyrics_file",
            "cover_image",
            "audio_file",
            "duration",
            "bitrate",
            "file_size",
            "adaptive_bitrate",
            "renditions",
            "default_stream_url",
        ]


class UploaderTrackSerializer(serializers.ModelSerializer):
    genre_name = serializers.SerializerMethodField()
    renditions = serializers.SerializerMethodField()

    def get_genre_name(self, obj):
        return obj.genre.name if obj.genre else None

    def get_renditions(self, obj):
        return [
            {
                "bitrate": item.bitrate,
                "url": item.audio_file.url if item.audio_file else None,
                "is_source": item.is_source,
            }
            for item in obj.renditions.order_by("bitrate")
            if item.audio_file
        ]

    class Meta:
        model = Track
        fields = [
            "id",
            "title",
            "description",
            "album_name",
            "album_artist",
            "album_cover_image",
            "album_track_order",
            "genre",
            "genre_name",
            "release_date",
            "language",
            "is_podcast",
            "explicit",
            "song_type",
            "featured_artists",
            "lyrics_text",
            "cover_image",
            "duration",
            "status",
            "rejection_reason",
            "created_at",
            "updated_at",
            "adaptive_bitrate",
            "renditions",
        ]


class UploaderTrackUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Track
        fields = [
            "title",
            "description",
            "album_name",
            "album_artist",
            "album_cover_image",
            "album_track_order",
            "genre",
            "release_date",
            "language",
            "is_podcast",
            "explicit",
            "song_type",
            "featured_artists",
            "lyrics_text",
            "adaptive_bitrate",
        ]

    def validate(self, attrs):
        genre = attrs.get("genre", getattr(self.instance, "genre", None))
        is_podcast = attrs.get("is_podcast", getattr(self.instance, "is_podcast", False))
        lyrics_text = attrs.get("lyrics_text", getattr(self.instance, "lyrics_text", ""))

        if genre is not None:
            expected_category = Genre.CATEGORY_PODCAST if is_podcast else Genre.CATEGORY_MUSIC
            if genre.category != expected_category:
                expected_label = "podcast" if is_podcast else "music"
                raise serializers.ValidationError(
                    {"genre": f"Selected genre must be a {expected_label} genre."}
                )

        if lyrics_text and len(lyrics_text) > 20000:
            raise serializers.ValidationError({"lyrics_text": "Lyrics text is too long."})

        return attrs
