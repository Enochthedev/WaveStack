from enum import Enum
from typing import Optional
from pydantic import BaseModel, HttpUrl, Field

class JobState(str, Enum):
    queued = "queued"
    started = "started"
    finished = "finished"
    failed = "failed"
    deferred = "deferred"
    canceled = "canceled"
    unknown = "unknown"

class ClipRequest(BaseModel):
    # FFmpeg can read HTTP(S) directly; you can add upload later.
    source: HttpUrl | str
    start_sec: float = Field(ge=0)
    duration_sec: float = Field(gt=0, le=3600)
    out_ext: str = Field(default="mp4", pattern="^(mp4|mov|webm|mkv)$")
    name: Optional[str] = None  # optional output base name

class ClipResult(BaseModel):
    job_id: str
    url: HttpUrl | str
    size_bytes: int
    filename: str

class JobStatus(BaseModel):
    job_id: str
    state: JobState
    error: Optional[str] = None
    result: Optional[ClipResult] = None

class EnqueueResponse(BaseModel):
    job_id: str