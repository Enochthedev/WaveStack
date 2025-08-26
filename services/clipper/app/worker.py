from __future__ import annotations

from rq import Worker, Queue
from redis import Redis

from app.core.config import settings
from app.core.logging import get_logger
from app.domain.models import ClipRequest
from app.application.use_cases.clip_video import ClipVideo
from app.infra.transcoder.ffmpeg import FfmpegTranscoderAdapter
from app.infra.storage.local import LocalStorageAdapter

log = get_logger("clipper.worker")


# Callable executed by RQ
def do_clip(req_dict: dict):
    req = ClipRequest(**req_dict)

    transcoder = FfmpegTranscoderAdapter()
    storage = LocalStorageAdapter(root=settings.DATA_DIR, public_base=str(settings.PUBLIC_BASE))

    use_case = ClipVideo(transcoder=transcoder, storage=storage)
    # If your use case exposes .run(), call .run(); if it implements __call__, you can call it directly.
    result = use_case(req)
    return result.model_dump()


def main():
    # sanity checks + logs help a ton
    if not settings.REDIS_URL:
        raise RuntimeError("REDIS_URL is not set")
    if not settings.QUEUE_NAME:
        raise RuntimeError("QUEUE_NAME is not set (e.g., 'clips')")

    log.info("worker starting", extra={
        "queue": settings.QUEUE_NAME,
        "redis": settings.REDIS_URL
    })

    r = Redis.from_url(settings.REDIS_URL)
    q = Queue(settings.QUEUE_NAME, connection=r)

    # 👇 pass the connection explicitly
    Worker([q], connection=r).work(with_scheduler=True)

if __name__ == "__main__":
    main()