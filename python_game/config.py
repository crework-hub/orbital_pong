import configparser
from dataclasses import dataclass
from pathlib import Path

from game_log import logger
from settings import GRAVITY, PADDLE_SPEED

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "physics.cfg"

DEFAULT_BALL_MASS = 1.0


# --- значения физики ---
@dataclass
class PhysicsConfig:
    gravity: float = GRAVITY
    ball_mass: float = DEFAULT_BALL_MASS
    paddle_speed: float = PADDLE_SPEED


def _read_positive(section, name, default):
    try:
        value = section.getfloat(name, fallback=default)
    except ValueError:
        print(f"physics.cfg: '{name}' не число, беру {default}")
        logger.warning("physics.cfg: '%s' не число, взято %s", name, default)
        return default

    if value <= 0:
        print(f"physics.cfg: '{name}' должно быть > 0, беру {default}")
        logger.warning("physics.cfg: '%s' должно быть > 0, взято %s", name, default)
        return default

    return value


# --- чтение physics.cfg ---
def load_physics(path=CONFIG_PATH):
    config = PhysicsConfig()
    parser = configparser.ConfigParser()

    try:
        found = parser.read(path, encoding="utf-8")
    except configparser.Error as error:
        print(f"physics.cfg: ошибка разбора ({error}), беру значения по умолчанию")
        logger.error("physics.cfg: ошибка разбора (%s), взяты значения по умолчанию", error)
        return config
    except (OSError, UnicodeDecodeError) as error:
        print(f"Не удалось прочитать physics.cfg ({error}), беру значения по умолчанию")
        logger.error("Не удалось прочитать physics.cfg: %s, взяты значения по умолчанию", error)
        return config

    if not found:
        print(f"physics.cfg не найден ({path}), беру значения по умолчанию")
        logger.warning("physics.cfg не найден, взяты значения по умолчанию")
        return config

    if not parser.has_section("physics"):
        print("physics.cfg: нет раздела [physics], беру значения по умолчанию")
        logger.warning("physics.cfg: нет раздела [physics], взяты значения по умолчанию")
        return config

    section = parser["physics"]
    config.gravity = _read_positive(section, "gravity", config.gravity)
    config.ball_mass = _read_positive(section, "ball_mass", config.ball_mass)
    config.paddle_speed = _read_positive(section, "paddle_speed", config.paddle_speed)
    logger.info(
        "Физика загружена: G=%s, масса мяча=%s, скорость ракеток=%s",
        config.gravity, config.ball_mass, config.paddle_speed
    )
    return config
