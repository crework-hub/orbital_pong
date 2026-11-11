import logging
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOG_PATH = ROOT / "pong_score.log"


# --- логгер ---
def _create_logger():
    log = logging.getLogger("orbital_pong")
    if log.handlers:
        return log

    log.setLevel(logging.INFO)
    log.propagate = False

    try:
        handler = logging.FileHandler(LOG_PATH, mode="a", encoding="utf-8")
    except OSError as error:
        print(f"Не удалось открыть лог {LOG_PATH}: {error}")
        log.addHandler(logging.NullHandler())
        return log

    handler.setFormatter(
        logging.Formatter(
            "%(asctime)s.%(msecs)03d | %(levelname)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    )
    log.addHandler(handler)
    return log


logger = _create_logger()


# --- голы ---
def log_goal(scorer, left_score, right_score, vx, vy):
    speed = math.hypot(vx, vy)
    logger.info(
        "ГОЛ: забил %s игрок | счёт %d:%d | скорость мяча %.2f px/кадр (vx=%.2f, vy=%.2f)",
        scorer, left_score, right_score, speed, vx, vy
    )
