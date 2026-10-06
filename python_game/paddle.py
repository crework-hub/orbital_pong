import pygame

from pathlib import Path

from settings import HEIGHT, PADDLE_SPEED, SPRITE_SCALE

ROOT = Path(__file__).resolve().parent.parent


class Paddle:

    def __init__(self, x, y):
        self.x = x
        self.y = y

        image = pygame.image.load(ROOT / "paddle.png").convert_alpha()
        size = (
            image.get_width() * SPRITE_SCALE,
            image.get_height() * SPRITE_SCALE
        )
        self.image = pygame.transform.scale(image, size)
        self.width = self.image.get_width()
        self.height = self.image.get_height()
        self.speed = PADDLE_SPEED

    def move_up(self):
        self.y -= self.speed
        if self.y < 0:
            self.y = 0

    def move_down(self):
        self.y += self.speed
        if self.y + self.height > HEIGHT:
            self.y = HEIGHT - self.height

    def get_rect(self):
        return pygame.Rect(self.x, self.y, self.width, self.height)

    def draw(self, screen):
        screen.blit(self.image, (self.x, self.y))
