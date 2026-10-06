from pathlib import Path

import pygame

from ball import Ball
from black_hole import BlackHole
from effects import Inflow, SpaceDust, Trail
from paddle import Paddle
from settings import BLACK, FPS, HEIGHT, WHITE, WIDTH, WIN_SCORE

ROOT = Path(__file__).resolve().parent.parent


class Game:

    def __init__(self):
        pygame.init()
        pygame.mixer.init()

        self.bounce = pygame.mixer.Sound(ROOT / "sounds" / "bounce.ogg")
        self.score_sound = pygame.mixer.Sound(ROOT / "sounds" / "score.ogg")
        pygame.mixer.music.load(ROOT / "sounds" / "space_song.ogg")
        pygame.mixer.music.set_volume(0.45)
        pygame.mixer.music.play(-1)

        self.screen = pygame.display.set_mode((WIDTH, HEIGHT))
        pygame.display.set_caption("Orbital Pong")

        font_path = str(ROOT / "font" / "EpilepsySansBold.ttf")
        self.font_title = pygame.font.Font(font_path, 64)
        self.font_score = pygame.font.Font(font_path, 36)
        self.font_text = pygame.font.Font(font_path, 28)

        self.clock = pygame.time.Clock()
        self.ball = Ball()

        self.left = Paddle(30, 0)
        self.left.y = HEIGHT // 2 - self.left.height // 2

        self.right = Paddle(WIDTH - 30 - self.left.width, 0)
        self.right.y = self.left.y

        self.black_hole = BlackHole()
        self.trail = Trail()
        self.dust = SpaceDust()
        self.inflow = Inflow()

        self.left_score = 0
        self.right_score = 0
        self.state = "menu"
        self.running = True

    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False

            if event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE:
                if self.state == "menu":
                    self.reset_match()
                    self.state = "play"
                elif self.state == "over":
                    self.state = "menu"

        if self.state != "play":
            return

        keys = pygame.key.get_pressed()

        if keys[pygame.K_w]:
            self.left.move_up()

        if keys[pygame.K_s]:
            self.left.move_down()

        if keys[pygame.K_UP]:
            self.right.move_up()

        if keys[pygame.K_DOWN]:
            self.right.move_down()

    def reset_match(self):
        self.left_score = 0
        self.right_score = 0
        self.ball.reset()
        self.trail.points.clear()
        self.left.y = HEIGHT // 2 - self.left.height // 2
        self.right.y = self.left.y

    def update(self, dt):
        self.black_hole.update(dt)
        self.dust.update(dt)
        self.inflow.update(dt)

        if self.state != "play":
            return

        if self.ball.update():
            self.bounce.play()

        self.trail.update(self.ball.x, self.ball.y)

        if self.ball.get_rect().colliderect(self.left.get_rect()):
            if self.ball.vx < 0:
                self.bounce.play()
            self.ball.vx = abs(self.ball.vx)

        if self.ball.get_rect().colliderect(self.right.get_rect()):
            if self.ball.vx > 0:
                self.bounce.play()
            self.ball.vx = -abs(self.ball.vx)

        if self.ball.x < 0:
            self.right_score += 1
            self.score_sound.play()
            self.ball.reset()
            self.trail.points.clear()

        if self.ball.x > WIDTH:
            self.left_score += 1
            self.score_sound.play()
            self.ball.reset()
            self.trail.points.clear()

        if self.left_score >= WIN_SCORE or self.right_score >= WIN_SCORE:
            self.state = "over"

    def draw_center(self, font, text, y):
        image = font.render(text, True, WHITE)
        rect = image.get_rect(center=(WIDTH // 2, y))
        self.screen.blit(image, rect)

    def draw(self):
        self.screen.fill(BLACK)
        self.dust.draw(self.screen)

        if self.state == "play":
            pygame.draw.line(
                self.screen,
                WHITE,
                (WIDTH // 2, 0),
                (WIDTH // 2, HEIGHT),
                1
            )

        self.inflow.draw(self.screen)
        self.black_hole.draw(self.screen)

        if self.state == "play":
            self.trail.draw(self.screen)
            self.ball.draw(self.screen)
            self.left.draw(self.screen)
            self.right.draw(self.screen)
            self.draw_center(
                self.font_score,
                f"{self.left_score} : {self.right_score}",
                36
            )
        elif self.state == "menu":
            self.draw_center(self.font_title, "ORBITAL PONG", 150)
            self.draw_center(self.font_text, "W S  —  левая ракетка", 430)
            self.draw_center(self.font_text, "стрелки  —  правая ракетка", 475)
            self.draw_center(self.font_text, "пробел  —  начать", 530)
        else:
            if self.left_score >= WIN_SCORE:
                winner = "победил левый игрок"
            else:
                winner = "победил правый игрок"

            self.draw_center(self.font_title, "ПОБЕДА", 140)
            self.draw_center(self.font_text, winner, 420)
            self.draw_center(
                self.font_score,
                f"{self.left_score} : {self.right_score}",
                475
            )
            self.draw_center(self.font_text, "пробел  —  в меню", 540)

        pygame.display.flip()

    def run(self):
        while self.running:
            dt = self.clock.tick(FPS)
            self.handle_events()
            self.update(dt)
            self.draw()

        pygame.mixer.music.stop()
        pygame.quit()
