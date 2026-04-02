from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("music", "0004_genre_category_and_seed_podcast_genres"),
    ]

    operations = [
        migrations.AddField(
            model_name="track",
            name="featured_artists",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="track",
            name="lyrics_file",
            field=models.FileField(blank=True, null=True, upload_to="lyrics/"),
        ),
        migrations.AddField(
            model_name="track",
            name="lyrics_text",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="track",
            name="song_type",
            field=models.CharField(
                choices=[
                    ("single", "Single"),
                    ("album", "Album Track"),
                    ("ep", "EP Track"),
                    ("podcast_episode", "Podcast Episode"),
                ],
                default="single",
                max_length=30,
            ),
        ),
    ]
