from level_loader import load_level

# Параметры арены берутся из level.json (если файла нет или он неверный,
# level_loader вернёт уровень по умолчанию).
_LEVEL = load_level()

WIDTH = _LEVEL["window"]["width"]
HEIGHT = _LEVEL["window"]["height"]

FPS = 60

BLACK = (0, 0, 0)
WHITE = (255, 255, 255)

CENTER_X = _LEVEL["black_hole"]["x"]
CENTER_Y = _LEVEL["black_hole"]["y"]

SERVE_VX = _LEVEL["serve"]["vx"]
SERVE_VY = _LEVEL["serve"]["vy"]

PADDLE_MARGIN = _LEVEL["paddle_margin"]
WIN_SCORE = _LEVEL["win_score"]

GRAVITY = 500

PADDLE_SPEED = 6
SPRITE_SCALE = 4
