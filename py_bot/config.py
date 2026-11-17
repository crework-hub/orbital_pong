import configparser
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
ADMIN_IDS = {int(x) for x in os.getenv("ADMIN_IDS", "").split(",") if x.strip().isdigit()}

SESSIONS_DIR = BASE_DIR / "sessions"
OUTPUT_DIR = BASE_DIR / "output"
LOG_PATH = BASE_DIR / "bot_flight.log"
LEADERBOARD_PATH = BASE_DIR / "leaderboard.csv"
PHYSICS_PATH = BASE_DIR.parent / "physics.cfg"

WIDTH = 800
HEIGHT = 600
CENTER_X = WIDTH // 2
CENTER_Y = HEIGHT // 2

MIN_MASS = 0.1
MAX_MASS = 1000.0
MAX_SPEED = 20.0
MAX_FILE_SIZE = 1_000_000

SESSIONS_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)


# --- физика из игры ---
def read_physics():
    parser = configparser.ConfigParser()
    try:
        parser.read(PHYSICS_PATH, encoding="utf-8")
        gravity = parser.getfloat("physics", "gravity", fallback=500.0)
        ball_mass = parser.getfloat("physics", "ball_mass", fallback=1.0)
    except (OSError, UnicodeDecodeError, configparser.Error, ValueError):
        return 500.0, 1.0
    if gravity <= 0 or ball_mass <= 0:
        return 500.0, 1.0
    return gravity, ball_mass


GRAVITY, BALL_MASS = read_physics()
