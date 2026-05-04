from rest_framework import serializers

from .models import RadioBroadcastSession, RadioQueueItem, Track


class RadioQueueItemSerializer(serializers.ModelSerializer):
    track_title = serializers.CharField(source="track.title", read_only=True)
    cover_image = serializers.ImageField(source="track.cover_image", read_only=True)

    class Meta:
        model = RadioQueueItem
        fields = ["id", "position", "track", "track_title", "cover_image", "created_at"]
        read_only_fields = ["id", "position", "created_at"]


class RadioQueueAddSerializer(serializers.Serializer):
    track_id = serializers.UUIDField()

    def validate_track_id(self, value):
        try:
            track = Track.objects.get(id=value, status="approved", is_podcast=False)
        except Track.DoesNotExist as exc:
            raise serializers.ValidationError("Track must be an approved Cadence song.") from exc
        self.context["track"] = track
        return value


class RadioBroadcastSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RadioBroadcastSession
        fields = [
            "id",
            "status",
            "started_at",
            "stopped_at",
            "hls_manifest_path",
            "updated_at",
            "created_at",
        ]
