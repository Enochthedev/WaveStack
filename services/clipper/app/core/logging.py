import logging
from logging.handlers import RotatingFileHandler
import os

def get_logger(name: str = "clipper") -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger  # already configured

    level = os.getenv("LOG_LEVEL", "INFO").upper()
    logger.setLevel(level)

    fmt = logging.Formatter(
        '%(asctime)s %(levelname)s %(name)s %(message)s',
        datefmt='%Y-%m-%dT%H:%M:%S%z'
    )

    # console
    sh = logging.StreamHandler()
    sh.setFormatter(fmt)
    logger.addHandler(sh)

    # optional file (rotated)
    log_path = os.getenv("LOG_FILE")
    if log_path:
        fh = RotatingFileHandler(log_path, maxBytes=5_000_000, backupCount=2)
        fh.setFormatter(fmt)
        logger.addHandler(fh)

    return logger