from pathlib import Path
from .base import StoragePort

class LocalStorageAdapter(StoragePort):
    def __init__(self, root: Path, public_base: str) -> None:
        self.root = root
        self.public_base = public_base.rstrip("/")

    def save(self, tmp_file: Path, dest_rel: str) -> str:
        dest_path = (self.root / dest_rel).resolve()
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        tmp_file.replace(dest_path)  # atomic move within volume
        dest_rel_normalized = dest_rel.replace("\\", "/")
        return f"{self.public_base}/{dest_rel_normalized}"