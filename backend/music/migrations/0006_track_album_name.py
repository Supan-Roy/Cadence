from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("music", "0005_track_upload_enhancements"),
    ]

    operations = [
        migrations.AddField(
            model_name="track",
            name="album_name",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
