/**
 * Игровые тела: мяч и ракетка (перенос Ball и Paddle из Python-версии).
 */

import { CONFIG } from './config.js';
import { Rect } from './rect.js';
import { gravityAcceleration, insideHole, angleDelta, segmentHitsCircle } from './physics.js';

export class Ball {
    constructor(x = CONFIG.WIDTH / 2, y = CONFIG.HEIGHT / 2) {
        this.x = x;
        this.y = y;
        this.vx = CONFIG.SERVE_VX;
        this.vy = CONFIG.SERVE_VY;
        this.radius = CONFIG.BALL_RADIUS;
        this.angle = 0;          // сколько радиан облетел вокруг дыры
        this.captured = false;   // мяч пересёк дыру на этом шаге
    }

    /** Прямоугольник мяча для проверки столкновений. */
    get rect() {
        return Rect.fromCircle(this.x, this.y, this.radius);
    }

    /** Скорость мяча, пикселей за кадр. */
    get speed() {
        return Math.hypot(this.vx, this.vy);
    }

    /**
     * Один шаг физики.
     * @param {number} mass масса чёрной дыры
     * @param {{x:number, y:number}} hole центр дыры
     * @returns {boolean} отскочил ли мяч от стены
     */
    update(mass, hole) {
        const prevX = this.x;
        const prevY = this.y;
        const prevAngle = Math.atan2(this.y - hole.y, this.x - hole.x);

        const a = gravityAcceleration(this.x, this.y, hole.x, hole.y, mass);
        this.vx += a.x;
        this.vy += a.y;

        this.x += this.vx;
        this.y += this.vy;

        // Дыра ловит мяч, даже если за кадр он перескочил её целиком.
        this.captured = segmentHitsCircle(prevX, prevY, this.x, this.y, hole.x, hole.y);

        const nextAngle = Math.atan2(this.y - hole.y, this.x - hole.x);
        this.angle += angleDelta(prevAngle, nextAngle);

        let bounced = false;

        if (this.y - this.radius <= 0) {
            this.y = this.radius;
            this.vy = -this.vy;
            bounced = true;
        }

        if (this.y + this.radius >= CONFIG.HEIGHT) {
            this.y = CONFIG.HEIGHT - this.radius;
            this.vy = -this.vy;
            bounced = true;
        }

        return bounced;
    }

    /** Упал ли мяч в чёрную дыру (по последнему шагу update). */
    fellIntoHole(hole) {
        return this.captured || insideHole(this.x, this.y, hole.x, hole.y);
    }

    /**
     * Подача заново: мяч появляется слева от дыры и летит к правой ракетке.
     * Ровно в центре подавать нельзя — там сама дыра.
     */
    reset() {
        this.x = CONFIG.WIDTH / 4;
        this.y = CONFIG.HEIGHT / 2;
        this.vx = CONFIG.SERVE_VX;
        this.vy = CONFIG.SERVE_VY;
        this.angle = 0;
        this.captured = false;
    }
}

export class Paddle {
    constructor(x, y, speed = CONFIG.PADDLE_SPEED) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.PADDLE_WIDTH;
        this.height = CONFIG.PADDLE_HEIGHT;
        this.speed = speed;
    }

    get rect() {
        return new Rect(this.x, this.y, this.width, this.height);
    }

    moveUp() {
        this.y = Math.max(0, this.y - this.speed);
    }

    moveDown() {
        this.y = Math.min(CONFIG.HEIGHT - this.height, this.y + this.speed);
    }

    /** Ракетка едет за целью по вертикали (простой ИИ). */
    track(targetY) {
        const target = targetY - this.height / 2;
        if (this.y < target - 1) this.moveDown();
        else if (this.y > target + 1) this.moveUp();
    }
}
