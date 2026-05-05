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


def _mic_segments_dir():
    segments = _hls_output_dir() / "mic_segments"
    segments.mkdir(parents=True, exist_ok=True)
    return segments


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


def init_mic_hls():
    output_dir = _hls_output_dir()
    run_id = uuid.uuid4().hex[:10]
    manifest_file = output_dir / f"index_mic_{run_id}.m3u8"
    segments_dir = _mic_segments_dir()
    session_dir = segments_dir / run_id
    session_dir.mkdir(parents=True, exist_ok=True)
    state = {
        "run_id": run_id,
        "sequence": 0,
        "window_size": 8,
        "segments": [],
        "segments_dir": str(session_dir),
        "manifest_file": str(manifest_file),
    }
    manifest_file.write_text("#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:4\n#EXT-X-MEDIA-SEQUENCE:0\n", encoding="utf-8")
    return state, f"radio/live/{manifest_file.name}"


def append_mic_chunk_to_hls(state, chunk_file):
    sequence = int(state["sequence"])
    window_size = int(state.get("window_size", 8))
    segments_dir = Path(state["segments_dir"])
    manifest_file = Path(state["manifest_file"])
    segment_path = segments_dir / f"segment_{sequence:05d}.ts"

    command = [
        _ffmpeg_bin(),
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        str(chunk_file),
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
        "mpegts",
        str(segment_path),
    ]
    result = subprocess.run(command, check=False, capture_output=True, text=True)
    if result.returncode != 0:
        message = (result.stderr or result.stdout or "").strip()
        raise RuntimeError(message or f"FFmpeg chunk transcode failed with code {result.returncode}")

    state["sequence"] = sequence + 1
    state.setdefault("segments", []).append(
        {
            "path": str(segment_path),
            "name": segment_path.name,
            "duration": 2.0,
        }
    )
    if len(state["segments"]) > window_size:
        removed = state["segments"].pop(0)
        try:
            Path(removed["path"]).unlink(missing_ok=True)
        except OSError:
            pass

    media_sequence = max(0, state["sequence"] - len(state["segments"]))
    lines = [
        "#EXTM3U",
        "#EXT-X-VERSION:3",
        "#EXT-X-TARGETDURATION:4",
        f"#EXT-X-MEDIA-SEQUENCE:{media_sequence}",
    ]
    for segment in state["segments"]:
        lines.append(f"#EXTINF:{segment['duration']:.3f},")
        lines.append(f"mic_segments/{state['run_id']}/{segment['name']}")
    manifest_file.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return state


def finalize_mic_hls(state):
    if not state:
        return
    manifest_path = state.get("manifest_file")
    if manifest_path:
        manifest_file = Path(manifest_path)
        if manifest_file.exists():
            contents = manifest_file.read_text(encoding="utf-8")
            if "#EXT-X-ENDLIST" not in contents:
                manifest_file.write_text(contents + "#EXT-X-ENDLIST\n", encoding="utf-8")
