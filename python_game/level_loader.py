import copy
import json
from pathlib import Path

from game_log import logger

ROOT = Path(__file__).resolve().parent.parent
LEVEL_PATH = ROOT / "level.json"

# Уровень по умолчанию: используется, если файла нет, он повреждён
# или в нём неверные значения.
DEFAULT_LEVEL = {
    "window": {"width": 800, "height": 600},
    "black_hole": {"x": 400, "y": 300},
    "serve": {"vx": 4, "vy": 2},
    "paddle_margin": 30,
    "win_score": 5,
}


def _pick(raw, path, low, high, problems, integer=False):
    # Достаём значение по пути ("window", "width") и проверяем тип и диапазон.
    # Если что-то не так, возвращаем значение по умолчанию и запоминаем проблему.
    default = DEFAULT_LEVEL
    for key in path:
        default = default[key]

    name = ".".join(path)
    node = raw
    for key in path:
        if not isinstance(node, dict) or key not in node:
            problems.append(f"нет поля '{name}'")
            return default
        node = node[key]

    # bool в Python тоже число (True == 1), поэтому отдельно его отсекаем.
    if isinstance(node, bool) or not isinstance(node, (int, float)):
        problems.append(f"поле '{name}' должно быть числом")
        return default

    if integer and node != int(node):
        problems.append(f"поле '{name}' должно быть целым")
        return default

    if not low <= node <= high:
        problems.append(f"поле '{name}' вне диапазона {low}..{high}")
        return default

    return int(node) if integer else node


def validate_level(raw):
    # Возвращает (готовый уровень, список проблем).
    problems = []
    level = copy.deepcopy(DEFAULT_LEVEL)

    if not isinstance(raw, dict):
        problems.append("корень файла должен быть объектом JSON")
        return level, problems

    level["window"]["width"] = _pick(raw, ("window", "width"), 400, 1920, problems, True)
    level["window"]["height"] = _pick(raw, ("window", "height"), 300, 1080, problems, True)
    level["black_hole"]["x"] = _pick(raw, ("black_hole", "x"), 0, 1920, problems, True)
    level["black_hole"]["y"] = _pick(raw, ("black_hole", "y"), 0, 1080, problems, True)
    level["serve"]["vx"] = _pick(raw, ("serve", "vx"), 1, 15, problems)
    level["serve"]["vy"] = _pick(raw, ("serve", "vy"), -15, 15, problems)
    level["paddle_margin"] = _pick(raw, ("paddle_margin",), 0, 200, problems, True)
    level["win_score"] = _pick(raw, ("win_score",), 1, 20, problems, True)

    # Чёрная дыра обязана быть внутри окна, иначе центр притяжения окажется за экраном.
    width = level["window"]["width"]
    height = level["window"]["height"]
    hole = level["black_hole"]
    if not (0 < hole["x"] < width and 0 < hole["y"] < height):
        problems.append("чёрная дыра вне окна, ставлю её в центр")
        hole["x"] = width // 2
        hole["y"] = height // 2

    return level, problems


def load_level(path=LEVEL_PATH):
    # Загружает level.json. Любая ошибка не роняет игру: берём уровень по умолчанию.
    try:
        with open(path, "r", encoding="utf-8") as file:
            raw = json.load(file)
    except FileNotFoundError:
        print(f"Файл уровня {path.name} не найден. Используется уровень по умолчанию.")
        logger.warning("Файл уровня не найден: %s, взят уровень по умолчанию", path)
        return copy.deepcopy(DEFAULT_LEVEL)
    except json.JSONDecodeError as error:
        print(f"Файл уровня {path.name} повреждён ({error}). Используется уровень по умолчанию.")
        logger.error("Файл уровня повреждён (%s), взят уровень по умолчанию", error)
        return copy.deepcopy(DEFAULT_LEVEL)
    except (OSError, UnicodeDecodeError) as error:
        print(f"Не удалось прочитать {path.name}: {error}. Используется уровень по умолчанию.")
        logger.error("Не удалось прочитать файл уровня: %s", error)
        return copy.deepcopy(DEFAULT_LEVEL)

    level, problems = validate_level(raw)

    for problem in problems:
        print(f"{path.name}: {problem}")
        logger.warning("level.json: %s", problem)

    logger.info(
        "Уровень загружен: окно %dx%d, дыра (%d, %d), до %d очков",
        level["window"]["width"], level["window"]["height"],
        level["black_hole"]["x"], level["black_hole"]["y"], level["win_score"]
    )
    return level
