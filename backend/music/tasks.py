from celery import shared_task

from .audio_processing import create_adaptive_bitrates


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={"max_retries": 3})
def process_track_adaptive_bitrates(self, track_id):
    create_adaptive_bitrates(track_id)
