from PIL import Image, ImageDraw

from config import CENTER_X, CENTER_Y, HEIGHT, OUTPUT_DIR, WIDTH

FRAMES = 45
FRAME_MS = 55
TRAIL = 30

BG = (6, 6, 18)
RING = (40, 30, 70)
HOLE_EDGE = (150, 90, 220)


def pick_points(points):
    count = len(points)
    if count <= FRAMES:
        return points
    return [points[round(i * (count - 1) / (FRAMES - 1))] for i in range(FRAMES)]


def draw_field(draw):
    for radius in range(60, 340, 40):
        draw.ellipse(
            [CENTER_X - radius, CENTER_Y - radius, CENTER_X + radius, CENTER_Y + radius],
            outline=RING,
        )
    draw.ellipse(
        [CENTER_X - 30, CENTER_Y - 30, CENTER_X + 30, CENTER_Y + 30],
        fill=(0, 0, 0), outline=HOLE_EDGE, width=4,
    )


def make_gif(points, user_id):
    points = pick_points(points)
    if len(points) < 2:
        points = points * 2

    frames = []
    for index in range(len(points)):
        image = Image.new("RGB", (WIDTH, HEIGHT), BG)
        draw = ImageDraw.Draw(image)
        draw_field(draw)

        # --- след и мяч ---
        start = max(0, index - TRAIL)
        for i in range(start, index):
            x, y = points[i]
            fade = (i - start) / max(1, index - start)
            colour = (int(60 * fade) + 20, int(120 * fade) + 20, int(220 * fade) + 35)
            radius = 2 + int(2 * fade)
            draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=colour)

        x, y = points[index]
        draw.ellipse([x - 9, y - 9, x + 9, y + 9], fill=(60, 140, 255))
        draw.ellipse([x - 6, y - 6, x + 6, y + 6], fill=(255, 255, 255))
        frames.append(image)

    path = OUTPUT_DIR / f"sim_{user_id}.gif"
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=FRAME_MS, loop=0)
    return path
