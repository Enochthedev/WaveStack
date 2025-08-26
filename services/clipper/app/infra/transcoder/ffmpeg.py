import subprocess, shlex, uuid
from pathlib import Path
from typing import Protocol

class TranscoderPort(Protocol):
    def clip(self, *, src: str, start: float, duration: float, out_path: Path) -> Path: ...

class FfmpegTranscoderAdapter(TranscoderPort):
    def __init__(self, ffmpeg_bin: str = "ffmpeg") -> None:
        self.ffmpeg = ffmpeg_bin

    def clip(self, *, src: str, start: float, duration: float, out_path: Path) -> Path:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        # stream copy when possible; fallback to re-encode by swapping -c copy with a codec if needed later
        cmd = f'{self.ffmpeg} -ss {start} -i "{src}" -t {duration} -c copy -y "{out_path}"'
        proc = subprocess.run(shlex.split(cmd), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if proc.returncode != 0:
            raise RuntimeError(proc.stderr.decode("utf-8", errors="ignore")[:1000])
        return out_path