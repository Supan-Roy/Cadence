from music.models import Track


class PodcastTrack(Track):
    class Meta:
        proxy = True
        verbose_name = "Podcast"
        verbose_name_plural = "Podcasts"
