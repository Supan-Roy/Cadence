from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.db import DatabaseError
from django.db.models import Max
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import RadioBroadcastSession, RadioQueueItem
from .permissions import IsAppAdmin
from .radio_hls import (
    append_mic_chunk_to_hls,
    finalize_mic_hls,
    init_live_input_hls,
    start_hls,
    stop_hls_process,
)
from .radio_process import pid_is_alive
from .radio_serializers import (
    RadioBroadcastSessionSerializer,
    RadioQueueAddSerializer,
    RadioQueueItemSerializer,
)


def reconcile_stale_live_sessions():
    now = timezone.now()
    for session in RadioBroadcastSession.objects.filter(status=RadioBroadcastSession.STATUS_LIVE):
        try:
            if not session.ffmpeg_pid and ("index_mic_" in (session.hls_manifest_path or "") or "index_device_" in (session.hls_manifest_path or "")):
                # Browser input modes use chunk uploads and have no long-running ffmpeg pid.
                continue
            if pid_is_alive(session.ffmpeg_pid):
                continue
            session.status = RadioBroadcastSession.STATUS_OFF_AIR
            session.stopped_at = now
            session.ffmpeg_pid = None
            session.save(update_fields=["status", "stopped_at", "ffmpeg_pid", "updated_at"])
        except Exception:
            continue


MIC_STATE_CACHE_KEY = "radio_mic_state"
MIC_CHUNK_LOCK_KEY = "radio_mic_chunk_lock"


class RadioQueueView(APIView):
    permission_classes = [IsAuthenticated, IsAppAdmin]
    throttle_classes = []

    def get(self, request):
        queue_items = RadioQueueItem.objects.select_related("track").order_by("position", "created_at")
        return Response(RadioQueueItemSerializer(queue_items, many=True).data)

    def post(self, request):
        serializer = RadioQueueAddSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        track = serializer.context["track"]

        max_position = RadioQueueItem.objects.aggregate(max_position=Max("position")).get("max_position") or 0
        queue_item = RadioQueueItem.objects.create(
            track=track,
            position=max_position + 1,
            added_by=request.user,
        )
        return Response(RadioQueueItemSerializer(queue_item).data, status=status.HTTP_201_CREATED)


class RadioQueueItemView(APIView):
    permission_classes = [IsAuthenticated, IsAppAdmin]
    throttle_classes = []

    def delete(self, request, pk):
        try:
            item = RadioQueueItem.objects.get(pk=pk)
        except RadioQueueItem.DoesNotExist:
            return Response({"detail": "Queue item not found."}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            removed_position = item.position
            item.delete()
            trailing_items = RadioQueueItem.objects.filter(position__gt=removed_position).order_by("position")
            for trailing_item in trailing_items:
                trailing_item.position -= 1
                trailing_item.save(update_fields=["position"])

        return Response(status=status.HTTP_204_NO_CONTENT)


class RadioBroadcastControlView(APIView):
    permission_classes = [IsAuthenticated, IsAppAdmin]
    throttle_classes = []

    def post(self, request):
        action = (request.data.get("action") or "").strip().lower()
        if action not in {"start", "stop"}:
            return Response({"detail": "action must be 'start' or 'stop'."}, status=status.HTTP_400_BAD_REQUEST)
        source_mode = (request.data.get("source_mode") or "cadence").strip().lower()
        if source_mode not in {"cadence", "mic", "device"}:
            source_mode = "cadence"

        lock_key = "radio_control_lock"
        lock_acquired = cache.add(lock_key, "1", timeout=5)
        if not lock_acquired:
            return Response(
                {"detail": "Another broadcast action is in progress. Please retry in a moment."},
                status=status.HTTP_409_CONFLICT,
            )

        try:
            reconcile_stale_live_sessions()
            active_session = (
                RadioBroadcastSession.objects.filter(status=RadioBroadcastSession.STATUS_LIVE).order_by("-created_at").first()
            )

            if action == "start":
                if active_session:
                    return Response({"detail": "Broadcast is already live."}, status=status.HTTP_400_BAD_REQUEST)

                try:
                    if source_mode in {"mic", "device"}:
                        mic_state, manifest_path = init_live_input_hls(source_mode=source_mode)
                        cache.set(MIC_STATE_CACHE_KEY, mic_state, timeout=60 * 60 * 8)
                        pid = None
                        log_path = ""
                    else:
                        queue_items = list(RadioQueueItem.objects.select_related("track").order_by("position", "created_at"))
                        if not queue_items:
                            return Response({"detail": "Queue is empty. Add at least one Cadence song."}, status=status.HTTP_400_BAD_REQUEST)
                        pid, log_path, manifest_path = start_hls(queue_items)
                except FileNotFoundError:
                    return Response(
                        {"detail": "FFmpeg binary was not found. Configure FFMPEG_BINARY and install ffmpeg."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )
                except RuntimeError as exc:
                    return Response(
                        {"detail": f"Unable to start broadcast encoder: {exc}"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )
                except Exception as exc:
                    return Response(
                        {"detail": f"Broadcast startup failed: {exc}"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

                try:
                    session = RadioBroadcastSession.objects.create(
                        status=RadioBroadcastSession.STATUS_LIVE,
                        started_by=request.user,
                        started_at=timezone.now(),
                        ffmpeg_pid=pid,
                        ffmpeg_log_path=log_path,
                        hls_manifest_path=manifest_path,
                    )
                except Exception as exc:
                    stop_hls_process(pid)
                    return Response(
                        {"detail": f"Failed to save broadcast session: {exc}"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )
                return Response(RadioBroadcastSessionSerializer(session).data, status=status.HTTP_201_CREATED)

            if not active_session:
                return Response({"detail": "Broadcast is already off air."}, status=status.HTTP_400_BAD_REQUEST)

            if active_session.ffmpeg_pid:
                stop_hls_process(active_session.ffmpeg_pid)
            mic_state = cache.get(MIC_STATE_CACHE_KEY)
            if mic_state:
                finalize_mic_hls(mic_state)
                cache.delete(MIC_STATE_CACHE_KEY)
            active_session.status = RadioBroadcastSession.STATUS_OFF_AIR
            active_session.stopped_by = request.user
            active_session.stopped_at = timezone.now()
            active_session.ffmpeg_pid = None
            active_session.save(update_fields=["status", "stopped_by", "stopped_at", "ffmpeg_pid", "updated_at"])
            return Response(RadioBroadcastSessionSerializer(active_session).data)
        except DatabaseError as exc:
            return Response(
                {"detail": f"Broadcast state update failed: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception as exc:
            return Response(
                {"detail": f"Broadcast control unexpected failure: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        finally:
            cache.delete(lock_key)


class RadioBroadcastStatusView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = []

    def get(self, request):
        reconcile_stale_live_sessions()
        latest_session = RadioBroadcastSession.objects.order_by("-created_at").first()
        queue_items = RadioQueueItem.objects.select_related("track").order_by("position", "created_at")
        now_playing = queue_items.first()

        manifest_url = None
        is_live = False
        if latest_session and latest_session.status == RadioBroadcastSession.STATUS_LIVE:
            manifest_path = (latest_session.hls_manifest_path or "").lstrip("/")
            if manifest_path:
                manifest_url = request.build_absolute_uri(f"{settings.MEDIA_URL}{manifest_path}")
            is_live = True

        return Response(
            {
                "is_live": is_live,
                "manifest_url": manifest_url,
                "source_mode": (
                    "mic"
                    if latest_session
                    and latest_session.status == RadioBroadcastSession.STATUS_LIVE
                    and "index_mic_" in (latest_session.hls_manifest_path or "")
                    else (
                        "device"
                        if latest_session
                        and latest_session.status == RadioBroadcastSession.STATUS_LIVE
                        and "index_device_" in (latest_session.hls_manifest_path or "")
                        else "cadence"
                    )
                ),
                "now_playing": RadioQueueItemSerializer(now_playing).data if now_playing else None,
                "queue": RadioQueueItemSerializer(queue_items, many=True).data,
            }
        )


class RadioMicChunkUploadView(APIView):
    permission_classes = [IsAuthenticated, IsAppAdmin]
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = []

    def post(self, request):
        reconcile_stale_live_sessions()
        active_session = (
            RadioBroadcastSession.objects.filter(status=RadioBroadcastSession.STATUS_LIVE).order_by("-created_at").first()
        )
        if not active_session:
            return Response({"detail": "Broadcast is not live."}, status=status.HTTP_400_BAD_REQUEST)
        if "index_mic_" not in (active_session.hls_manifest_path or "") and "index_device_" not in (
            active_session.hls_manifest_path or ""
        ):
            return Response({"detail": "Current broadcast source is not a browser live input mode."}, status=status.HTTP_400_BAD_REQUEST)

        audio_chunk = request.FILES.get("chunk")
        if not audio_chunk:
            return Response({"detail": "Missing chunk file."}, status=status.HTTP_400_BAD_REQUEST)

        lock_acquired = cache.add(MIC_CHUNK_LOCK_KEY, "1", timeout=5)
        if not lock_acquired:
            return Response({"detail": "Chunk pipeline busy; retry."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        try:
            mic_state = cache.get(MIC_STATE_CACHE_KEY)
            if not mic_state:
                return Response({"detail": "Mic stream state not initialized."}, status=status.HTTP_409_CONFLICT)

            from tempfile import NamedTemporaryFile

            with NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
                for chunk in audio_chunk.chunks():
                    temp_file.write(chunk)
                temp_path = temp_file.name

            try:
                mic_state = append_mic_chunk_to_hls(mic_state, temp_path)
            finally:
                from pathlib import Path
                Path(temp_path).unlink(missing_ok=True)

            cache.set(MIC_STATE_CACHE_KEY, mic_state, timeout=60 * 60 * 8)
            return Response({"ok": True, "sequence": mic_state.get("sequence", 0)})
        except FileNotFoundError:
            return Response(
                {"detail": "FFmpeg binary was not found. Configure FFMPEG_BINARY and install ffmpeg."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except RuntimeError as exc:
            return Response({"detail": f"Unable to process mic chunk: {exc}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            cache.delete(MIC_CHUNK_LOCK_KEY)
