import logging
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOG_PATH = ROOT / "pong_score.log"


def _create_logger():
    # Логгер пишет в pong_score.log: каждая строка начинается с даты и времени
    # (с миллисекундами), затем идут уровень события и текст.
    log = logging.getLogger("orbital_pong")
    if log.handlers:
        return log

    log.setLevel(logging.INFO)
    log.propagate = False

    try:
        handler = logging.FileHandler(LOG_PATH, mode="a", encoding="utf-8")
    except OSError as error:
        # Нет прав на запись и т.п.: игра должна работать и без лога.
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


def log_goal(scorer, left_score, right_score, vx, vy):
    # Задание варианта 15: время гола, счёт и скорость мяча в момент
    # пересечения линии ворот. Время добавляет сам logging.
    speed = math.hypot(vx, vy)
    logger.info(
        "ГОЛ: забил %s игрок | счёт %d:%d | скорость мяча %.2f px/кадр (vx=%.2f, vy=%.2f)",
        scorer, left_score, right_score, speed, vx, vy
    )
