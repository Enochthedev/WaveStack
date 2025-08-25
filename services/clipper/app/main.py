from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import subprocess, uuid, os, tempfile, shutil

app = FastAPI()

class ClipReq(BaseModel):
    src: str       # VOD URL or file path
    start: float   # seconds
    end: float     # seconds
    layout: str = "9x16"  # or "16x9"

@app.get("/health")
def health(): return {"status":"ok"}

@app.post("/v1/clip")
def clip(req: ClipReq):
    if req.end <= req.start: raise HTTPException(400, "end must be > start")
    vf = "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
        if req.layout == "9x16" else "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2"
    out_dir = "/data"
    os.makedirs(out_dir, exist_ok=True)
    out = f"{out_dir}/clip_{uuid.uuid4().hex}.mp4"
    # temp dir for progressive download if needed (ffmpeg handles http)
    args = [
        "ffmpeg","-y",
        "-ss", str(req.start), "-i", req.src,
        "-t", str(req.end - req.start),
        "-vf", vf,
        "-c:v","libx264","-preset","veryfast","-crf","20",
        "-c:a","aac","-b:a","192k",
        out
    ]
    try:
        subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    except subprocess.CalledProcessError:
        raise HTTPException(500, "ffmpeg failed")
    public_base = os.getenv("PUBLIC_BASE","http://localhost:8081")
    return {"url": f"{public_base}/files/{os.path.basename(out)}"}