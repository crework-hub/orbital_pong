import pygame
import math

from pathlib import Path

from settings import WIDTH, HEIGHT, CENTER_X, CENTER_Y, GRAVITY, SPRITE_SCALE

ROOT = Path(__file__).resolve().parent.parent


class Ball:

    def __init__(self):
        self.x = 200
        self.y = 200

        self.vx = 4
        self.vy = 2

        image = pygame.image.load(ROOT / "ball.png").convert_alpha()
        size = (
            image.get_width() * SPRITE_SCALE,
            image.get_height() * SPRITE_SCALE
        )
        self.image = pygame.transform.scale(image, size)
        self.radius = self.image.get_width() // 2

    def update(self):
        dx = CENTER_X - self.x
        dy = CENTER_Y - self.y

        distance = math.sqrt(dx * dx + dy * dy)

        if distance > 10:
            force = GRAVITY / (distance * distance)

            self.vx += force * dx / distance
            self.vy += force * dy / distance

        self.x += self.vx
        self.y += self.vy

        bounced = False

        if self.y - self.radius <= 0:
            self.y = self.radius
            self.vy = -self.vy
            bounced = True

        if self.y + self.radius >= HEIGHT:
            self.y = HEIGHT - self.radius
            self.vy = -self.vy
            bounced = True

        return bounced

    def get_rect(self):
        return pygame.Rect(
            self.x - self.radius,
            self.y - self.radius,
            self.radius * 2,
            self.radius * 2
        )

    def draw(self, screen):
        rect = self.image.get_rect(center=(int(self.x), int(self.y)))
        screen.blit(self.image, rect)

    def reset(self):
        self.x = WIDTH // 2
        self.y = HEIGHT // 2

        self.vx = 4
        self.vy = 2