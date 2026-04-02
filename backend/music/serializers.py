from rest_framework import serializers
from .models import Genre, Track


class TrackUploadSerializer(serializers.ModelSerializer):

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

    def create(self, validated_data):
        validated_data["artist"] = self.context["request"].user
        validated_data["status"] = "pending"
        return super().create(validated_data)

    def validate(self, attrs):
        genre = attrs.get("genre")
        is_podcast = attrs.get("is_podcast", False)
        lyrics_file = attrs.get("lyrics_file")
        lyrics_text = attrs.get("lyrics_text", "")

        if genre is None:
            return attrs

        expected_category = Genre.CATEGORY_PODCAST if is_podcast else Genre.CATEGORY_MUSIC
        if genre.category != expected_category:
            expected_label = "podcast" if is_podcast else "music"
            raise serializers.ValidationError(
                {"genre": f"Selected genre must be a {expected_label} genre."}
            )

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

    class Meta:
        model = Track
        fields = [
            "id",
            "title",
            "description",
            "artist_name",
            "genre",
            "release_date",
            "language",
            "song_type",
            "is_podcast",
            "explicit",
            "featured_artists",
            "cover_image",
            "audio_file",
        ]

class TrackDetailSerializer(serializers.ModelSerializer):
    artist_name = serializers.SerializerMethodField()
    genre_name = serializers.SerializerMethodField()

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

    class Meta:
        model = Track
        fields = [
            "id",
            "title",
            "description",
            "artist_name",
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
        ]


class UploaderTrackSerializer(serializers.ModelSerializer):
    genre_name = serializers.SerializerMethodField()

    def get_genre_name(self, obj):
        return obj.genre.name if obj.genre else None

    class Meta:
        model = Track
        fields = [
            "id",
            "title",
            "description",
            "genre",
            "genre_name",
            "release_date",
            "language",
            "is_podcast",
            "explicit",
            "song_type",
            "featured_artists",
            "lyrics_text",
            "status",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]


class UploaderTrackUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Track
        fields = [
            "title",
            "description",
            "genre",
            "release_date",
            "language",
            "is_podcast",
            "explicit",
            "song_type",
            "featured_artists",
            "lyrics_text",
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
