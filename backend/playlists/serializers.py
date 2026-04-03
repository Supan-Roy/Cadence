from rest_framework import serializers

from music.serializers import TrackListSerializer
from .models import Playlist


class PlaylistSerializer(serializers.ModelSerializer):
    track_count = serializers.SerializerMethodField()
    has_track = serializers.SerializerMethodField()

    class Meta:
        model = Playlist
        fields = [
            "id",
            "name",
            "description",
            "cover_image",
            "track_count",
            "has_track",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "track_count", "has_track", "created_at", "updated_at"]

    def get_track_count(self, obj):
        return obj.tracks.count()

    def get_has_track(self, obj):
        track_id = self.context.get("track_id")
        if not track_id:
            return False
        return obj.tracks.filter(id=track_id).exists()

    def validate_name(self, value):
        clean = (value or "").strip()
        if not clean:
            raise serializers.ValidationError("Playlist name is required.")

        request = self.context.get("request")
        user = getattr(request, "user", None)

        if user and user.is_authenticated:
            queryset = Playlist.objects.filter(user=user, name__iexact=clean)
            if self.instance is not None:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError("Playlist with this name already exists.")

        return clean


class PlaylistDetailSerializer(PlaylistSerializer):
    tracks = TrackListSerializer(many=True, read_only=True)

    class Meta(PlaylistSerializer.Meta):
        fields = PlaylistSerializer.Meta.fields + ["tracks"]
