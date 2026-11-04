"""Рисует полёт мяча в GIF средствами Pillow. Каждый кадр — отдельная картинка."""

from pathlib import Path

from PIL import Image, ImageDraw

from config import CENTER_X, CENTER_Y, HEIGHT, OUTPUT_DIR, WIDTH

FRAMES = 45          # сколько кадров в GIF
FRAME_MS = 55        # задержка между кадрами, мс
TRAIL = 30           # сколько последних точек рисуем как след

BG = (6, 6, 18)
HOLE_RING = (150, 90, 220)
ORBIT_RING = (40, 30, 70)
BALL = (255, 255, 255)


def _draw_background(draw: ImageDraw.ImageDraw) -> None:
    """Фон: концентрические кольца вокруг дыры — они показывают искривление поля."""
    for radius in range(60, 340, 40):
        draw.ellipse(
            [CENTER_X - radius, CENTER_Y - radius,
             CENTER_X + radius, CENTER_Y + radius],
            outline=ORBIT_RING, width=1,
        )


def _draw_hole(draw: ImageDraw.ImageDraw) -> None:
    draw.ellipse(
        [CENTER_X - 30, CENTER_Y - 30, CENTER_X + 30, CENTER_Y + 30],
        fill=(0, 0, 0), outline=HOLE_RING, width=4,
    )
    draw.ellipse(
        [CENTER_X - 12, CENTER_Y - 12, CENTER_X + 12, CENTER_Y + 12],
        fill=(0, 0, 0),
    )


def make_gif(points, path: Path) -> Path:
    """Строит GIF по списку точек траектории и сохраняет его."""
    if len(points) < 2:
        points = points * 2

    # Из длинной траектории берём ровно FRAMES точек.
    step = max(1, len(points) // FRAMES)
    sampled = points[::step][:FRAMES]

    frames = []
    for index in range(len(sampled)):
        image = Image.new("RGB", (WIDTH, HEIGHT), BG)
        draw = ImageDraw.Draw(image)
        _draw_background(draw)
        _draw_hole(draw)

        # След мяча: старые точки бледнее, свежие ярче.
        start = max(0, index - TRAIL)
        for trail_index in range(start, index):
            x, y = sampled[trail_index]
            fade = (trail_index - start) / max(1, index - start)
            colour = (int(60 * fade) + 20, int(120 * fade) + 20, int(220 * fade) + 35)
            radius = 2 + int(2 * fade)
            draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=colour)

        # Сам мяч: белый с голубым ободком.
        x, y = sampled[index]
        draw.ellipse([x - 9, y - 9, x + 9, y + 9], fill=(60, 140, 255))
        draw.ellipse([x - 6, y - 6, x + 6, y + 6], fill=BALL)

        frames.append(image)

    path = Path(path)
    frames[0].save(
        path,
        save_all=True,
        append_images=frames[1:],
        duration=FRAME_MS,
        loop=0,
    )
    return path


def gif_path(user_id: int, number: int) -> Path:
    """Уникальное имя файла для каждого запуска."""
    return OUTPUT_DIR / f"sim_{user_id}_{number}.gif"
