from django.db import models
from django.conf import settings
import uuid

class Genre(models.Model):
    CATEGORY_MUSIC = "music"
    CATEGORY_PODCAST = "podcast"
    CATEGORY_CHOICES = (
        (CATEGORY_MUSIC, "Music"),
        (CATEGORY_PODCAST, "Podcast"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default=CATEGORY_MUSIC)

    def __str__(self):
        return self.name


class Track(models.Model):

        STATUS_CHOICES = (
            ("pending", "Pending"),
            ("approved", "Approved"),
            ("rejected", "Rejected"),
        )

        SONG_TYPE_CHOICES = (
            ("single", "Single"),
            ("album", "Album Track"),
            ("ep", "EP Track"),
            ("podcast_episode", "Podcast Episode"),
        )

        id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

        artist = models.ForeignKey(
            settings.AUTH_USER_MODEL,
            on_delete=models.CASCADE,
            related_name="tracks"
        )
        
        title = models.CharField(max_length=255)
        description = models.TextField(blank=True)

        genre = models.ForeignKey(
            Genre,
            on_delete=models.SET_NULL,
            null=True,
            related_name="tracks"
        )

        release_date = models.DateField()

        language = models.CharField(max_length=100)
        is_podcast = models.BooleanField(default=False)
        adaptive_bitrate = models.BooleanField(default=False)
        explicit = models.BooleanField(default=False)
        song_type = models.CharField(max_length=30, choices=SONG_TYPE_CHOICES, default="single")
        album_name = models.CharField(max_length=255, blank=True)
        album_artist = models.CharField(max_length=255, blank=True, default="")
        album_cover_image = models.ImageField(upload_to="covers/albums/", blank=True, null=True)
        album_track_order = models.PositiveIntegerField(default=0)
        featured_artists = models.TextField(blank=True)
        lyrics_text = models.TextField(blank=True)
        lyrics_file = models.FileField(upload_to="lyrics/", blank=True, null=True)

        audio_file = models.FileField(upload_to="tracks/")
        cover_image = models.ImageField(upload_to="covers/")

        duration = models.PositiveBigIntegerField(null=True, blank=True)
        bitrate = models.PositiveBigIntegerField(null=True, blank=True)
        file_size = models.PositiveBigIntegerField(null=True, blank=True)

        status = models.CharField(
            max_length=20,
            choices=STATUS_CHOICES,
            default="pending"
        )

        reviewed_by = models.ForeignKey(
            settings.AUTH_USER_MODEL,
            null=True,
            blank=True,
            on_delete=models.SET_NULL,
            related_name="reviewed_tracks"
        )

        rejection_reason = models.TextField(blank=True)

        created_at = models.DateTimeField(auto_now_add=True)
        updated_at = models.DateTimeField(auto_now=True)

        def __str__(self):
            return f"{self.title} - {self.artist.email}"


class TrackRendition(models.Model):
        track = models.ForeignKey(
            Track,
            on_delete=models.CASCADE,
            related_name="renditions",
        )
        bitrate = models.PositiveIntegerField()
        audio_file = models.FileField(upload_to="tracks/renditions/")
        is_source = models.BooleanField(default=False)
        created_at = models.DateTimeField(auto_now_add=True)
        updated_at = models.DateTimeField(auto_now=True)

        class Meta:
            unique_together = ("track", "bitrate")
            ordering = ["bitrate"]

        def __str__(self):
            source_label = "source" if self.is_source else "derived"
            return f"{self.track_id} - {self.bitrate}kbps ({source_label})"


class RadioBroadcastSession(models.Model):
        STATUS_OFF_AIR = "off_air"
        STATUS_LIVE = "live"
        STATUS_CHOICES = (
            (STATUS_OFF_AIR, "Off Air"),
            (STATUS_LIVE, "Live"),
        )

        status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OFF_AIR)
        started_by = models.ForeignKey(
            settings.AUTH_USER_MODEL,
            on_delete=models.SET_NULL,
            null=True,
            blank=True,
            related_name="started_radio_sessions",
        )
        stopped_by = models.ForeignKey(
            settings.AUTH_USER_MODEL,
            on_delete=models.SET_NULL,
            null=True,
            blank=True,
            related_name="stopped_radio_sessions",
        )
        started_at = models.DateTimeField(blank=True, null=True)
        stopped_at = models.DateTimeField(blank=True, null=True)
        hls_manifest_path = models.CharField(max_length=500, blank=True)
        ffmpeg_pid = models.PositiveIntegerField(blank=True, null=True)
        ffmpeg_log_path = models.CharField(max_length=500, blank=True)
        updated_at = models.DateTimeField(auto_now=True)
        created_at = models.DateTimeField(auto_now_add=True)

        class Meta:
            ordering = ["-created_at"]

        def __str__(self):
            return f"Radio session {self.id} ({self.status})"


class RadioQueueItem(models.Model):
        track = models.ForeignKey(Track, on_delete=models.CASCADE, related_name="radio_queue_items")
        position = models.PositiveIntegerField()
        added_by = models.ForeignKey(
            settings.AUTH_USER_MODEL,
            on_delete=models.SET_NULL,
            null=True,
            blank=True,
            related_name="radio_queue_items",
        )
        created_at = models.DateTimeField(auto_now_add=True)

        class Meta:
            ordering = ["position", "created_at"]
            unique_together = ("position",)

        def __str__(self):
            return f"{self.position}: {self.track.title}"