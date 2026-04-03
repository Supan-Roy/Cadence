from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("music", "0006_track_album_name"),
    ]

    operations = [
        migrations.AddField(
            model_name="track",
            name="album_artist",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]