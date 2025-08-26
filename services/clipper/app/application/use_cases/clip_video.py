from dataclasses import dataclass
from pathlib import Path
import uuid
from ...domain.models import ClipRequest, ClipResult
from ...core.config import settings
from ...infra.transcoder.ffmpeg import TranscoderPort
from ...infra.storage.base import StoragePort

@dataclass
class ClipVideo:
    transcoder: TranscoderPort
    storage: StoragePort

    def __call__(self, req: ClipRequest) -> ClipResult:
        base = req.name or uuid.uuid4().hex
        filename = f"{base}.{req.out_ext}"
        tmp = settings.DATA_DIR / "_tmp" / uuid.uuid4().hex / filename
        out_rel = f"{base[:2]}/{base[2:4]}/{filename}"  # shard small dirs

        # 1) transcode (clip) to tmp
        out_file = self.transcoder.clip(
            src=str(req.source),
            start=req.start_sec,
            duration=req.duration_sec,
            out_path=tmp,
        )

        # 2) persist (local now, uploader service later)
        url = self.storage.save(out_file, out_rel)

        # 3) result
        size = (settings.DATA_DIR / out_rel).stat().st_size
        return ClipResult(job_id="", url=url, size_bytes=size, filename=filename)