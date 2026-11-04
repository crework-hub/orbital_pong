"""Полёт мяча вокруг чёрной дыры. Чистая математика, без Telegram и Pygame.

Формула из варианта 15: F = G / (d * d), ускорение направлено к центру.
Масса дыры M увеличивает силу: F = G * M / (d * d), ускорение = F / m мяча.
Считаем по кадрам, как в самой игре: скорость в пикселях за кадр, 60 кадров в секунду.
"""

import math

from config import CENTER_X, CENTER_Y, HEIGHT

G = 500.0            # гравитационная постоянная из physics.cfg игры
BALL_MASS = 1.0      # масса мяча
HOLE_RADIUS = 10.0   # мяч ближе этого — упал в дыру
MAX_FRAMES = 900     # 15 секунд максимум
FPS = 60

START_X = 80.0
START_Y = float(HEIGHT // 2)


def _wrap(delta: float) -> float:
    """Приводит разницу углов к диапазону -pi..pi (переход через 180°)."""
    while delta > math.pi:
        delta -= 2 * math.pi
    while delta < -math.pi:
        delta += 2 * math.pi
    return delta


def run_simulation(hole_mass: float, vx: float, vy: float) -> dict:
    """Считает траекторию мяча и возвращает результат.

    points  — точки (x, y) для GIF
    verdict — "fell" (упал в дыру), "orbit" (сделал оборот), "escaped" (улетел)
    duration— время полёта в секундах
    angle   — сколько градусов мяч пролетел вокруг дыры
    """
    x, y = START_X, START_Y
    speed_x, speed_y = float(vx), float(vy)
    points = [(x, y)]

    turned = 0.0
    prev_angle = math.atan2(y - CENTER_Y, x - CENTER_X)

    def result(verdict: str, frames: int) -> dict:
        return {
            "points": points,
            "verdict": verdict,
            "duration": frames / FPS,
            "angle": abs(math.degrees(turned)),
        }

    for frame in range(MAX_FRAMES):
        dx = CENTER_X - x
        dy = CENTER_Y - y
        distance = math.hypot(dx, dy)

        if distance <= HOLE_RADIUS:
            points.append((CENTER_X, CENTER_Y))
            return result("fell", frame + 1)

        # Сила и ускорение: F = G * M / (d * d), a = F / m.
        force = G * hole_mass / (distance * distance)
        acceleration = force / BALL_MASS
        speed_x += acceleration * dx / distance
        speed_y += acceleration * dy / distance

        x += speed_x
        y += speed_y
        points.append((x, y))

        # Сколько градусов мяч облетел вокруг дыры.
        angle = math.atan2(y - CENTER_Y, x - CENTER_X)
        turned += _wrap(angle - prev_angle)
        prev_angle = angle

        if abs(math.degrees(turned)) >= 360:
            return result("orbit", frame + 1)

        # Улетел далеко за пределы поля — дальше считать незачем.
        if x < -400 or x > 1200 or y < -400 or y > 1000:
            return result("escaped", frame + 1)

    return result("escaped", MAX_FRAMES)
