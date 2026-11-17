import math

from config import BALL_MASS, CENTER_X, CENTER_Y, GRAVITY, HEIGHT

HOLE_RADIUS = 10.0
MAX_FRAMES = 900
FPS = 60

START_X = 80.0
START_Y = HEIGHT / 2


def wrap(delta):
    while delta > math.pi:
        delta -= 2 * math.pi
    while delta < -math.pi:
        delta += 2 * math.pi
    return delta


def run_simulation(hole_mass, vx, vy):
    x, y = START_X, START_Y
    points = [(x, y)]

    turned = 0.0
    prev_angle = math.atan2(y - CENTER_Y, x - CENTER_X)

    def result(verdict, frames):
        return {
            "points": points,
            "verdict": verdict,
            "duration": frames / FPS,
            "angle": abs(math.degrees(turned)),
        }

    # --- кадры ---
    for frame in range(MAX_FRAMES):
        dx = CENTER_X - x
        dy = CENTER_Y - y
        distance = math.hypot(dx, dy)

        if distance <= HOLE_RADIUS:
            points.append((CENTER_X, CENTER_Y))
            return result("fell", frame + 1)

        force = GRAVITY * hole_mass / (distance * distance)
        acceleration = force / BALL_MASS
        vx += acceleration * dx / distance
        vy += acceleration * dy / distance

        x += vx
        y += vy
        points.append((x, y))

        angle = math.atan2(y - CENTER_Y, x - CENTER_X)
        turned += wrap(angle - prev_angle)
        prev_angle = angle

        if abs(math.degrees(turned)) >= 360:
            return result("orbit", frame + 1)

        if x < -400 or x > 1200 or y < -400 or y > 1000:
            return result("escaped", frame + 1)

    return result("escaped", MAX_FRAMES)


def verdict_ru(verdict):
    return {
        "orbit": "совершил оборот вокруг дыры",
        "fell": "упал в чёрную дыру",
        "escaped": "улетел из системы",
    }.get(verdict, verdict)
