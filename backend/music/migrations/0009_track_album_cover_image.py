from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("music", "0008_track_album_track_order"),
    ]

    operations = [
        migrations.AddField(
            model_name="track",
            name="album_cover_image",
            field=models.ImageField(blank=True, null=True, upload_to="covers/albums/"),
        ),
    ]
