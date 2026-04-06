from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("music", "0007_track_album_artist"),
    ]

    operations = [
        migrations.AddField(
            model_name="track",
            name="album_track_order",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
