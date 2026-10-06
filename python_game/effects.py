import math
import random

import pygame

from settings import WIDTH, HEIGHT, CENTER_X, CENTER_Y, WHITE


class Trail:

    def __init__(self):
        self.points = []
        self.max_points = 15

    def update(self, x, y):
        self.points.append((int(x), int(y)))
        if len(self.points) > self.max_points:
            self.points.pop(0)

    def draw(self, screen):
        for point in self.points:
            pygame.draw.circle(
                screen,
                WHITE,
                point,
                2
            )


class SpaceDust:

    def __init__(self):
        self.particles = [self._create() for _ in range(40)]
        self.sprites = {}

        for size in (4, 8):
            image = pygame.Surface((size, size), pygame.SRCALPHA)
            image.fill((255, 255, 255, 128))
            self.sprites[size] = image

    def _create(self):
        size = 8 if random.random() < 0.15 else 4

        return {
            "x": random.uniform(0, WIDTH),
            "y": random.uniform(0, HEIGHT),
            "vx": random.uniform(-3, 3),
            "vy": random.uniform(-2, 2),
            "size": size,
        }

    def update(self, dt):
        seconds = min(dt, 50) / 1000

        for particle in self.particles:
            particle["x"] += particle["vx"] * seconds
            particle["y"] += particle["vy"] * seconds

            if particle["x"] < 0:
                particle["x"] += WIDTH
            elif particle["x"] >= WIDTH:
                particle["x"] -= WIDTH

            if particle["y"] < 0:
                particle["y"] += HEIGHT
            elif particle["y"] >= HEIGHT:
                particle["y"] -= HEIGHT

    def draw(self, screen):
        for particle in self.particles:
            size = particle["size"]
            x = int(particle["x"]) // 4 * 4
            y = int(particle["y"]) // 4 * 4
            screen.blit(self.sprites[size], (x, y))


class Inflow:

    def __init__(self):
        self.particles = [self._create() for _ in range(36)]

    def _create(self):
        angle = random.uniform(0, math.tau)
        distance = random.uniform(70, 340)

        x = CENTER_X + math.cos(angle) * distance
        y = CENTER_Y + math.sin(angle) * distance

        tangent = random.uniform(4, 12) * random.choice((-1, 1))
        inward = random.uniform(5, 12)

        return {
            "x": x,
            "y": y,
            "vx": -math.sin(angle) * tangent - math.cos(angle) * inward,
            "vy": math.cos(angle) * tangent - math.sin(angle) * inward,
        }

    def update(self, dt):
        seconds = min(dt, 50) / 1000

        for particle in self.particles:
            dx = CENTER_X - particle["x"]
            dy = CENTER_Y - particle["y"]
            distance = math.hypot(dx, dy)

            if distance < 16:
                particle.update(self._create())
                continue

            force = 28 + 700 / distance
            particle["vx"] += force * dx / distance * seconds
            particle["vy"] += force * dy / distance * seconds

            speed = math.hypot(particle["vx"], particle["vy"])
            if speed > 55:
                particle["vx"] *= 55 / speed
                particle["vy"] *= 55 / speed

            particle["x"] += particle["vx"] * seconds
            particle["y"] += particle["vy"] * seconds

    def draw(self, screen):
        for particle in self.particles:
            x = int(particle["x"])
            y = int(particle["y"])

            if x < 0 or y < 0 or x >= WIDTH or y >= HEIGHT:
                continue

            distance = math.hypot(CENTER_X - particle["x"], CENTER_Y - particle["y"])
            size = 8 if distance < 120 else 4
            px = x // 4 * 4
            py = y // 4 * 4
            pygame.draw.rect(screen, WHITE, (px, py, size, size))