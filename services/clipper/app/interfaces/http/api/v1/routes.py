from fastapi import APIRouter, Depends, HTTPException
from fastapi import status as http_status

from app.core.config import settings
from app.core.logging import get_logger
from app.domain.models import ClipRequest, JobStatus, EnqueueResponse, JobState
from app.application.use_cases.get_status import GetStatus
from app.infra.queue.redis import RedisQueueAdapter

log = get_logger("clipper.api")
router = APIRouter(prefix="/api/v1", tags=["clipper"])

# DI helpers
def get_queue() -> RedisQueueAdapter:
    return RedisQueueAdapter(redis_url=settings.REDIS_URL, queue_name=settings.QUEUE_NAME)

@router.get("/health", summary="Health check", response_model=dict)
def health():
    return {"status": "ok"}

@router.post(
    "/clip",
    response_model=EnqueueResponse,
    status_code=http_status.HTTP_202_ACCEPTED,
    summary="Enqueue clip job",
    description="Queues a clipping job and returns a job_id to poll.",
)
def create_clip(
    req: ClipRequest,
    q: RedisQueueAdapter = Depends(get_queue),
) -> EnqueueResponse:
    # lightweight guardrails (optional)
    if req.duration_sec <= 0 or req.duration_sec > 60 * 60:
        raise HTTPException(status_code=400, detail="duration_seconds must be 1..3600")

    job_id = q.enqueue("app.worker.do_clip", kwargs={"req_dict": req.model_dump()})
    log.info("enqueued clip", extra={"job_id": job_id, "source": req.source})
    return EnqueueResponse(job_id=job_id)

@router.get(
    "/status/{job_id}",
    response_model=JobStatus,
    summary="Get job status",
    responses={
        200: {"description": "Job status returned"},
        404: {"description": "Job not found"},
    },
)
def get_job_status(job_id: str, q: RedisQueueAdapter = Depends(get_queue)) -> JobStatus:
    status_use_case = GetStatus(queue=q)
    js = status_use_case(job_id)
    if js.state == JobState.unknown:
        raise HTTPException(status_code=404, detail="job not found")
    log.info("status", extra={"job_id": job_id, "state": js.state})
    return js