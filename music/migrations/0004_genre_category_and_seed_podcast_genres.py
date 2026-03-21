from django.db import migrations, models


PODCAST_GENRES = [
    "Podcast",
    "Space",
    "Education",
    "Technology",
    "Business",
    "Health",
]


def seed_podcast_genres(apps, schema_editor):
    Genre = apps.get_model("music", "Genre")

    for genre_name in PODCAST_GENRES:
        Genre.objects.get_or_create(
            name=genre_name,
            defaults={"category": "podcast"},
        )

    Genre.objects.filter(name__in=PODCAST_GENRES).update(category="podcast")


class Migration(migrations.Migration):

    dependencies = [
        ("music", "0003_add_podcast_genre"),
    ]

    operations = [
        migrations.AddField(
            model_name="genre",
            name="category",
            field=models.CharField(
                choices=[("music", "Music"), ("podcast", "Podcast")],
                default="music",
                max_length=20,
            ),
        ),
        migrations.RunPython(seed_podcast_genres, migrations.RunPython.noop),
    ]
