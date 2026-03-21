from django.db import migrations


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("music", "0004_genre_category_and_seed_podcast_genres"),
    ]

    operations = [
        migrations.CreateModel(
            name="PodcastTrack",
            fields=[],
            options={
                "verbose_name": "Podcast",
                "verbose_name_plural": "Podcasts",
                "proxy": True,
                "indexes": [],
                "constraints": [],
            },
            bases=("music.track",),
        ),
    ]
