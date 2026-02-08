from rest_framework import serializers
from .models import Track


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

class TrackListSerializer(serializers.ModelSerializer):
    artist_email = serializers.EmailField(source="artist.email", read_only=True)

    class Meta:
        model = Track
        fields = [
            "id",
            "title",
            "artist_email",
            "genre",
            "release_date",
            "language",
            "explicit",
            "cover_image",
        ]

class TrackDetailSerializer(serializers.ModelSerializer):
    artist_email = serializers.EmailField(source="artist.email", read_only=True)
    genre_name = serializers.SerializerMethodField()

    def get_genre_name(self, obj):
        return obj.genre.name if obj.genre else None

    class Meta:
        model = Track
        fields = [
            "id",
            "title",
            "description",
            "artist_email",
            "genre_name",
            "release_date",
            "language",
            "explicit",
            "cover_image",
            "duration",
            "bitrate",
            "file_size",
        ]
