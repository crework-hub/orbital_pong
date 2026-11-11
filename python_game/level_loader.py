import copy
import json
from pathlib import Path

from game_log import logger

ROOT = Path(__file__).resolve().parent.parent
LEVEL_PATH = ROOT / "level.json"


# --- уровень по умолчанию ---
DEFAULT_LEVEL = {
    "window": {"width": 800, "height": 600},
    "black_hole": {"x": 400, "y": 300},
    "serve": {"vx": 4, "vy": 2},
    "paddle_margin": 30,
    "win_score": 5,
}


# --- проверка ---
def validate_level(raw):
    try:
        level = {
            "window": {
                "width": int(raw["window"]["width"]),
                "height": int(raw["window"]["height"]),
            },
            "black_hole": {
                "x": int(raw["black_hole"]["x"]),
                "y": int(raw["black_hole"]["y"]),
            },
            "serve": {
                "vx": float(raw["serve"]["vx"]),
                "vy": float(raw["serve"]["vy"]),
            },
            "paddle_margin": int(raw["paddle_margin"]),
            "win_score": int(raw["win_score"]),
        }
    except (KeyError, TypeError, ValueError):
        return None

    width = level["window"]["width"]
    height = level["window"]["height"]
    if width < 400 or height < 300 or level["win_score"] < 1:
        return None

    hole = level["black_hole"]
    if not (0 < hole["x"] < width and 0 < hole["y"] < height):
        hole["x"] = width // 2
        hole["y"] = height // 2

    return level


# --- загрузка ---
def load_level(path=LEVEL_PATH):
    try:
        with open(path, "r", encoding="utf-8") as file:
            raw = json.load(file)
    except FileNotFoundError:
        print(f"{path.name} не найден, беру уровень по умолчанию")
        logger.warning("Файл уровня не найден: %s, взят уровень по умолчанию", path)
        return copy.deepcopy(DEFAULT_LEVEL)
    except (OSError, ValueError) as error:
        print(f"{path.name} повреждён ({error}), беру уровень по умолчанию")
        logger.error("Файл уровня повреждён (%s), взят уровень по умолчанию", error)
        return copy.deepcopy(DEFAULT_LEVEL)

    level = validate_level(raw)
    if level is None:
        print(f"{path.name}: неверные значения, беру уровень по умолчанию")
        logger.warning("level.json: неверные значения, взят уровень по умолчанию")
        return copy.deepcopy(DEFAULT_LEVEL)

    logger.info(
        "Уровень загружен: окно %dx%d, дыра (%d, %d), до %d очков",
        level["window"]["width"], level["window"]["height"],
        level["black_hole"]["x"], level["black_hole"]["y"], level["win_score"]
    )
    return level