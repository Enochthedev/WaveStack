from typing import Protocol
from pathlib import Path

class StoragePort(Protocol):
    def save(self, tmp_file: Path, dest_rel: str) -> str:
        """Persist tmp_file under dest_rel (path-like key). Return public URL (or path)."""
        ...