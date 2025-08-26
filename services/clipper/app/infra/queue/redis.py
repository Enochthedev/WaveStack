# app/infra/queue/redis.py
from __future__ import annotations
from typing import Any, Callable, Union, overload, cast
from rq import Queue
from rq.job import Job
from rq.exceptions import NoSuchJobError
from redis import Redis
from app.core.config import settings
from app.domain.models import JobState

class RedisQueueAdapter:
    def __init__(self, redis_url: str | None = None, queue_name: str | None = None) -> None:
        url = redis_url or settings.REDIS_URL
        name = queue_name or settings.QUEUE_NAME
        self.redis = Redis.from_url(url)
        self.queue = Queue(name=name, connection=self.redis)

    @overload
    def enqueue(self, func: str, *, kwargs: dict | None = None) -> str: ...
    @overload
    def enqueue(self, func: Callable[..., Any], *, kwargs: dict | None = None) -> str: ...

    def enqueue(self, func: Union[str, Callable[..., Any]], *, kwargs: dict | None = None) -> str:
        # RQ accepts dotted path or callable; cast silences the strict type stub.
        job = self.queue.enqueue(cast(Any, func), kwargs=(kwargs or {}))
        return job.id

    def status(self, job_id: str) -> tuple[JobState, Job | None]:
        try:
            job = Job.fetch(job_id, connection=self.redis)
        except NoSuchJobError:
            return JobState.unknown, None
        state = job.get_status()
        state_map = {
            "queued": JobState.queued,
            "started": JobState.started,
            "finished": JobState.finished,
            "failed": JobState.failed,
            "deferred": JobState.deferred,
            "canceled": JobState.canceled,
        }
        return state_map.get(state, JobState.unknown), job