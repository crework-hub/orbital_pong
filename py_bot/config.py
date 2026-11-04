"""Настройки бота: токен, пути, константы игры."""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Токен бота лежит в .env, а не в коде: в репозиторий он не попадает.
try:
    from dotenv import load_dotenv

    load_dotenv(BASE_DIR / ".env")
except ImportError:
    # Без python-dotenv бот всё равно работает: токен можно задать переменной окружения.
    pass

BOT_TOKEN = os.getenv("BOT_TOKEN", "")

SESSIONS_DIR = BASE_DIR / "sessions"
OUTPUT_DIR = BASE_DIR / "output"
HISTORY_PATH = BASE_DIR / "history.csv"
LOG_PATH = BASE_DIR / "bot_flight.log"

# Параметры поля — те же, что в самой игре (settings.py / level.json).
WIDTH = 800
HEIGHT = 600
CENTER_X = WIDTH // 2
CENTER_Y = HEIGHT // 2

# Границы ввода: защита от бессмысленных значений.
MIN_MASS = 0.1
MAX_MASS = 1000.0
MAX_SPEED = 20.0

SESSIONS_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)
