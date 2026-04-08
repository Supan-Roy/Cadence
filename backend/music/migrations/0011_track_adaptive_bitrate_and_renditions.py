import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("music", "0010_seed_popular_music_genres"),
    ]

    operations = [
        migrations.AddField(
            model_name="track",
            name="adaptive_bitrate",
            field=models.BooleanField(default=False),
        ),
        migrations.CreateModel(
            name="TrackRendition",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("bitrate", models.PositiveIntegerField()),
                ("audio_file", models.FileField(upload_to="tracks/renditions/")),
                ("is_source", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "track",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="renditions", to="music.track"),
                ),
            ],
            options={
                "ordering": ["bitrate"],
                "unique_together": {("track", "bitrate")},
            },
        ),
    ]
