import struct
import zlib
from pathlib import Path

import pygame

from settings import CENTER_X, CENTER_Y, SPRITE_SCALE

ROOT = Path(__file__).resolve().parent.parent


def _blend_pixel(dst, src):
    src_alpha = src[3] / 255
    if src_alpha == 0:
        return dst

    dst_alpha = dst[3] / 255
    out_alpha = src_alpha + dst_alpha * (1 - src_alpha)
    if out_alpha == 0:
        return (0, 0, 0, 0)

    scale = dst_alpha * (1 - src_alpha)
    red = (src[0] * src_alpha + dst[0] * scale) / out_alpha
    green = (src[1] * src_alpha + dst[1] * scale) / out_alpha
    blue = (src[2] * src_alpha + dst[2] * scale) / out_alpha
    return (int(red), int(green), int(blue), int(out_alpha * 255))


def _decode_cel_image(payload, color_depth):
    width, height = struct.unpack_from("<HH", payload, 16)
    if struct.unpack_from("<H", payload, 7)[0] == 2:
        raw = zlib.decompress(payload[20:])
    else:
        raw = payload[20:20 + width * height * (color_depth // 8)]
    return width, height, raw


def load_aseprite_frames(path):
    data = Path(path).read_bytes()
    frame_count, width, height, depth = struct.unpack_from("<HHHH", data, 6)
    if depth != 32:
        raise ValueError("Нужен Aseprite-файл в режиме RGBA")

    offset = 128
    parsed_frames = []

    for _ in range(frame_count):
        frame_size = struct.unpack_from("<I", data, offset)[0]
        duration = struct.unpack_from("<H", data, offset + 8)[0]
        chunk_count = struct.unpack_from("<I", data, offset + 12)[0]
        cursor = offset + 16
        cels = {}

        for _chunk in range(chunk_count):
            chunk_size, chunk_type = struct.unpack_from("<IH", data, cursor)
            payload = data[cursor + 6:cursor + chunk_size]

            if chunk_type == 0x2005:
                layer, cel_x, cel_y, _opacity, cel_type = struct.unpack_from("<HhhBH", payload, 0)
                if cel_type == 1:
                    link = struct.unpack_from("<H", payload, 16)[0]
                    cels[layer] = ("link", link, cel_x, cel_y)
                elif cel_type in (0, 2):
                    image_width, image_height, raw = _decode_cel_image(payload, depth)
                    cels[layer] = ("image", cel_x, cel_y, image_width, image_height, raw)

            cursor += chunk_size

        parsed_frames.append((duration, cels))
        offset += frame_size

    surfaces = []
    durations = []

    layer_count = 0
    for _duration, cels in parsed_frames:
        if cels:
            layer_count = max(layer_count, max(cels) + 1)

    for duration, cels in parsed_frames:
        canvas = [(0, 0, 0, 0)] * (width * height)

        for layer in range(layer_count):
            cel = cels.get(layer)
            if cel is None:
                continue

            if cel[0] == "link":
                source = parsed_frames[cel[1]][1].get(layer)
                if source is None or source[0] != "image":
                    continue
                _kind, cel_x, cel_y, image_width, image_height, raw = source
            else:
                _kind, cel_x, cel_y, image_width, image_height, raw = cel

            for pixel_y in range(image_height):
                for pixel_x in range(image_width):
                    target_x = cel_x + pixel_x
                    target_y = cel_y + pixel_y
                    if not (0 <= target_x < width and 0 <= target_y < height):
                        continue

                    start = (pixel_y * image_width + pixel_x) * 4
                    src = tuple(raw[start:start + 4])
                    index = target_y * width + target_x
                    canvas[index] = _blend_pixel(canvas[index], src)

        raw_canvas = bytes(channel for pixel in canvas for channel in pixel)
        surface = pygame.image.frombytes(raw_canvas, (width, height), "RGBA").convert_alpha()
        scaled = (
            width * SPRITE_SCALE,
            height * SPRITE_SCALE
        )
        surfaces.append(pygame.transform.scale(surface, scaled))
        durations.append(duration if duration > 0 else 100)

    return surfaces, durations


class BlackHole:

    def __init__(self):
        self.x = CENTER_X
        self.y = CENTER_Y

        self.frames, self.durations = load_aseprite_frames(ROOT / "black_hole.aseprite")
        self.frame_index = 0
        self.timer = 0

    def update(self, dt):
        self.timer += dt
        duration = self.durations[self.frame_index]

        while self.timer >= duration:
            self.timer -= duration
            self.frame_index = (self.frame_index + 1) % len(self.frames)

    def draw(self, screen):
        image = self.frames[self.frame_index]
        rect = image.get_rect(center=(self.x, self.y))
        screen.blit(image, rect)
