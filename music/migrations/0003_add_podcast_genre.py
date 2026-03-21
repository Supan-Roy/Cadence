from django.db import migrations


def add_podcast_genre(apps, schema_editor):
    Genre = apps.get_model("music", "Genre")
    Genre.objects.get_or_create(name="Podcast")


class Migration(migrations.Migration):

    dependencies = [
        ("music", "0002_track_is_podcast"),
    ]

    operations = [
        migrations.RunPython(add_podcast_genre, migrations.RunPython.noop),
    ]
