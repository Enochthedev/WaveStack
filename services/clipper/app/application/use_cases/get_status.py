from dataclasses import dataclass
from typing import Any
from ...domain.models import JobStatus, JobState, ClipResult

@dataclass
class GetStatus:
    # queue has .status(job_id) -> (JobState, Job|None)
    queue: Any

    def __call__(self, job_id: str) -> JobStatus:
        state, job = self.queue.status(job_id)
        result = None
        err = None
        if state == JobState.finished and job is not None:
            payload = job.result  # should be ClipResult dict
            if isinstance(payload, dict):
                result = ClipResult(**payload)
        if state == JobState.failed and job is not None:
            err = (job.exc_info or "")[:800]
        return JobStatus(job_id=job_id, state=state, error=err, result=result)