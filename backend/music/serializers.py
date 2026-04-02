from rest_framework import serializers
from .models import Genre, Track


class TrackUploadSerializer(serializers.ModelSerializer):

    class Meta:
        model = Track
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

        if genre is None:
            return attrs

        expected_category = Genre.CATEGORY_PODCAST if is_podcast else Genre.CATEGORY_MUSIC
        if genre.category != expected_category:
            expected_label = "podcast" if is_podcast else "music"
            raise serializers.ValidationError(
                {"genre": f"Selected genre must be a {expected_label} genre."}
            )

        return attrs


class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ["id", "name", "category"]

class TrackListSerializer(serializers.ModelSerializer):
    artist_name = serializers.CharField(source="artist.name", read_only=True)

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
            "explicit",
            "cover_image",
            "audio_file",
        ]

class TrackDetailSerializer(serializers.ModelSerializer):
    artist_name = serializers.CharField(source="artist.name", read_only=True)
    genre_name = serializers.SerializerMethodField()

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
            "explicit",
            "cover_image",
            "audio_file",
            "duration",
            "bitrate",
            "file_size",
        ]
