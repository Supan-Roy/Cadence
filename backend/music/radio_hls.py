import os
import signal
import subprocess
import time
import uuid
from pathlib import Path

from django.conf import settings


def _runtime_dir():
    runtime = Path(settings.MEDIA_ROOT) / "radio" / "runtime"
    runtime.mkdir(parents=True, exist_ok=True)
    return runtime


def _hls_output_dir():
    output_dir = Path(settings.MEDIA_ROOT) / "radio" / "live"
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def _ffmpeg_bin():
    return getattr(settings, "FFMPEG_BINARY", "ffmpeg")


def _safe_path(path):
    return str(path).replace("\\", "/").replace("'", "'\\''")


def build_concat_file(queue_items):
    runtime = _runtime_dir()
    concat_file = runtime / "queue.txt"
    lines = []
    for queue_item in queue_items:
        audio_path = getattr(queue_item.track.audio_file, "path", None)
        if audio_path:
            lines.append(f"file '{_safe_path(audio_path)}'")

    concat_file.write_text("\n".join(lines), encoding="utf-8")
    return concat_file


def start_hls(queue_items):
    concat_file = build_concat_file(queue_items)
    output_dir = _hls_output_dir()
    run_id = uuid.uuid4().hex[:10]
    manifest_file = output_dir / f"index_{run_id}.m3u8"
    segment_pattern = output_dir / f"segment_{run_id}_%05d.ts"
    log_file = _runtime_dir() / "ffmpeg.log"

    command = [
        _ffmpeg_bin(),
        "-hide_banner",
        "-loglevel",
        "warning",
        "-stream_loop",
        "-1",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(concat_file),
        "-vn",
        "-ar",
        "44100",
        "-ac",
        "2",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-f",
        "hls",
        "-hls_time",
        "4",
        "-hls_list_size",
        "8",
        "-hls_flags",
        "delete_segments+append_list+independent_segments",
        "-hls_segment_filename",
        str(segment_pattern),
        str(manifest_file),
    ]

    with open(log_file, "ab") as out:
        process = subprocess.Popen(command, stdout=out, stderr=out)

    # Wait up to ~3s: encode startup can be slower on Windows; avoid false failures.
    deadline = time.monotonic() + 3.0
    while time.monotonic() < deadline:
        code = process.poll()
        if code is None:
            time.sleep(0.2)
            continue
        if code != 0:
            raise RuntimeError(f"FFmpeg exited with code {code}.")
        raise RuntimeError("FFmpeg exited before HLS streaming started.")

    manifest_relative = f"radio/live/{manifest_file.name}"
    return process.pid, str(log_file), manifest_relative


def stop_hls_process(pid):
    if not pid:
        return

    try:
        if os.name == "nt":
            subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], check=False)
        else:
            os.kill(pid, signal.SIGTERM)
    except OSError:
        pass
