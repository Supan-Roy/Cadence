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
        explicit = models.BooleanField(default=False)
        song_type = models.CharField(max_length=30, choices=SONG_TYPE_CHOICES, default="single")
        album_name = models.CharField(max_length=255, blank=True)
        album_artist = models.CharField(max_length=255, blank=True, default="")
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