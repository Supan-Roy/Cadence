from django.db import models
import uuid


class Playlist(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	user = models.ForeignKey(
		"accounts.User",
		on_delete=models.CASCADE,
		related_name="playlists",
	)
	name = models.CharField(max_length=120)
	description = models.TextField(blank=True)
	cover_image = models.ImageField(upload_to="playlist_covers/", blank=True, null=True)
	tracks = models.ManyToManyField("music.Track", related_name="playlists", blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		unique_together = ("user", "name")
		ordering = ["-updated_at"]

	def __str__(self):
		return f"{self.name} ({self.user.email})"
