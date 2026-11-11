from pathlib import Path

import pygame

from ball import Ball
from black_hole import BlackHole
from config import load_physics
from effects import Inflow, SpaceDust, Trail
from paddle import Paddle
from game_log import log_goal, logger
from records import load_top, save_record
from settings import BLACK, FPS, HEIGHT, PADDLE_MARGIN, WHITE, WIDTH, WIN_SCORE

ROOT = Path(__file__).resolve().parent.parent


class Game:
    def __init__(self):
        self.physics = load_physics()
        logger.info("Запуск игры Orbital Pong")

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
        self.font_small = pygame.font.Font(font_path, 22)

        self.clock = pygame.time.Clock()
        self.ball = Ball(self.physics.gravity, self.physics.ball_mass)

        self.left = Paddle(PADDLE_MARGIN, 0, self.physics.paddle_speed)
        self.left.y = HEIGHT // 2 - self.left.height // 2

        self.right = Paddle(WIDTH - PADDLE_MARGIN - self.left.width, 0, self.physics.paddle_speed)
        self.right.y = self.left.y

        self.black_hole = BlackHole()
        self.trail = Trail()
        self.dust = SpaceDust()
        self.inflow = Inflow()

        self.left_score = 0
        self.right_score = 0
        self.state = "menu"
        self.running = True

        self.match_start = 0
        self.match_time = 0.0
        self.winner_side = ""
        self.player_name = ""
        self.top = []

    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False

            if event.type == pygame.KEYDOWN and self.state == "name":
                self.handle_name_key(event)
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE:
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
        self.match_start = pygame.time.get_ticks()
        logger.info("Партия началась, играем до %d очков", WIN_SCORE)

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
            log_goal(
                "правый", self.left_score, self.right_score,
                self.ball.vx, self.ball.vy
            )
            self.score_sound.play()
            self.ball.reset()
            self.trail.points.clear()

        if self.ball.x > WIDTH:
            self.left_score += 1
            log_goal(
                "левый", self.left_score, self.right_score,
                self.ball.vx, self.ball.vy
            )
            self.score_sound.play()
            self.ball.reset()
            self.trail.points.clear()

        if self.left_score >= WIN_SCORE or self.right_score >= WIN_SCORE:
            self.finish_match()

    def finish_match(self):
        self.match_time = (pygame.time.get_ticks() - self.match_start) / 1000
        self.winner_side = "левый" if self.left_score >= WIN_SCORE else "правый"
        self.player_name = ""
        self.state = "name"
        logger.info(
            "ПОБЕДА: %s игрок, счёт %d:%d, партия %.1f с",
            self.winner_side, self.left_score, self.right_score, self.match_time
        )

    def handle_name_key(self, event):
        if event.key in (pygame.K_RETURN, pygame.K_KP_ENTER):
            self.save_result()
        elif event.key == pygame.K_BACKSPACE:
            self.player_name = self.player_name[:-1]
        elif event.unicode and event.unicode.isprintable() and len(self.player_name) < 12:
            self.player_name += event.unicode

    def save_result(self):
        name = self.player_name.strip() or "Игрок"
        if self.winner_side == "левый":
            score_text = f"{self.left_score}:{self.right_score}"
        else:
            score_text = f"{self.right_score}:{self.left_score}"

        save_record(name, score_text, self.match_time)
        self.top = load_top(5)
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
        elif self.state == "name":
            self.draw_center(self.font_title, "ПОБЕДА", 140)
            self.draw_center(self.font_text, f"победил {self.winner_side} игрок", 230)
            self.draw_center(
                self.font_score,
                f"{self.left_score} : {self.right_score}",
                290
            )
            self.draw_center(self.font_text, "Имя победителя:", 400)

            cursor = "_" if (pygame.time.get_ticks() // 500) % 2 == 0 else " "
            self.draw_center(self.font_score, self.player_name + cursor, 450)
            self.draw_center(self.font_text, "Enter  —  сохранить", 540)
        else:
            self.draw_center(self.font_title, "ПОБЕДА", 90)
            self.draw_center(self.font_text, f"победил {self.winner_side} игрок", 160)
            self.draw_center(
                self.font_score,
                f"{self.left_score} : {self.right_score}",
                210
            )
            self.draw_center(self.font_text, "Лучшие партии (по времени)", 285)

            if not self.top:
                self.draw_center(self.font_small, "рекордов пока нет", 340)

            for place, row in enumerate(self.top, start=1):
                line = f"{place}. {row['Имя']}  —  {row['_time']:.1f} с  ({row['Счёт']})"
                self.draw_center(self.font_small, line, 320 + place * 30)

            self.draw_center(self.font_text, "пробел  —  в меню", 540)

        pygame.display.flip()

    def run(self):
        while self.running:
            dt = self.clock.tick(FPS)
            self.handle_events()
            self.update(dt)
            self.draw()

        logger.info("Выход из игры")
        pygame.mixer.music.stop()
        pygame.quit()
