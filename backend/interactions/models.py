from django.db import models

# Create your models here.
from django.db import models
from django.conf import settings
import uuid


class PlayHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="play_history"
    )

    track = models.ForeignKey(
        "music.Track",
        on_delete=models.CASCADE,
        related_name="plays"
    )

    played_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} played {self.track.title}"
