import subprocess
import tempfile
from pathlib import Path

from django.core.files import File

from .models import Track, TrackRendition


TARGET_BITRATES = [96, 128, 256]


def _run_command(command):
    completed = subprocess.run(
        command,
        capture_output=True,
        text=True,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(completed.stderr.strip() or "Command failed")
    return completed.stdout.strip()


def probe_audio_bitrate_kbps(file_path):
    output = _run_command(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "a:0",
            "-show_entries",
            "stream=bit_rate",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(file_path),
        ]
    )
    if not output:
        return 0
    try:
        return max(0, int(output) // 1000)
    except (TypeError, ValueError):
        return 0


def _encode_mp3(input_path, output_path, bitrate_kbps):
    _run_command(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(input_path),
            "-vn",
            "-codec:a",
            "libmp3lame",
            "-b:a",
            f"{bitrate_kbps}k",
            str(output_path),
        ]
    )


def _save_rendition_file(track, source_file_path, bitrate, is_source=False):
    # `upload_to` on the model already adds "tracks/renditions/".
    # Keep names track-scoped to avoid collisions across different tracks.
    storage_name = f"{track.id}/{bitrate}kbps.mp3"
    with open(source_file_path, "rb") as handle:
        rendition, _ = TrackRendition.objects.get_or_create(track=track, bitrate=bitrate)
        if rendition.audio_file:
            rendition.audio_file.delete(save=False)
        rendition.audio_file.save(storage_name, File(handle), save=False)
        rendition.is_source = is_source
        rendition.save(update_fields=["audio_file", "is_source", "updated_at"])


def create_adaptive_bitrates(track_id):
    track = Track.objects.get(pk=track_id)

    if track.is_podcast or not track.adaptive_bitrate:
        return

    source_path = Path(track.audio_file.path)
    if not source_path.exists():
        raise FileNotFoundError(f"Audio file not found: {source_path}")

    source_bitrate = probe_audio_bitrate_kbps(source_path)
    if source_bitrate <= 0:
        source_bitrate = 256

    with tempfile.TemporaryDirectory(prefix=f"track-{track.id}-") as temp_dir:
        temp_dir_path = Path(temp_dir)

        if source_bitrate > 256:
            # Keep high-bitrate source as an available rendition.
            _save_rendition_file(track, source_path, source_bitrate, is_source=True)
        else:
            target_256_path = temp_dir_path / "256kbps.mp3"
            _encode_mp3(source_path, target_256_path, 256)
            _save_rendition_file(track, target_256_path, 256, is_source=True)

        for bitrate in TARGET_BITRATES:
            if bitrate == 256 and source_bitrate <= 256:
                continue
            output_path = temp_dir_path / f"{bitrate}kbps.mp3"
            _encode_mp3(source_path, output_path, bitrate)
            _save_rendition_file(track, output_path, bitrate, is_source=False)
