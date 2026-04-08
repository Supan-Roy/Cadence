from django.db import migrations


POPULAR_MUSIC_GENRES = [
    "Pop",
    "Hip-Hop",
    "Rap",
    "R&B",
    "Soul",
    "Rock",
    "Alternative",
    "Indie",
    "Metal",
    "Punk",
    "Electronic",
    "Dance",
    "House",
    "Techno",
    "Trance",
    "EDM",
    "Jazz",
    "Blues",
    "Classical",
    "Soundtrack",
    "Lo-Fi",
    "Chill",
    "Ambient",
    "Folk",
    "Country",
    "Reggae",
    "Afrobeats",
    "Latin",
    "K-Pop",
    "J-Pop",
]


def seed_popular_music_genres(apps, schema_editor):
    Genre = apps.get_model("music", "Genre")

    for name in POPULAR_MUSIC_GENRES:
        Genre.objects.get_or_create(
            name=name,
            defaults={"category": "music"},
        )


class Migration(migrations.Migration):

    dependencies = [
        ("music", "0009_track_album_cover_image"),
    ]

    operations = [
        migrations.RunPython(seed_popular_music_genres, migrations.RunPython.noop),
    ]

