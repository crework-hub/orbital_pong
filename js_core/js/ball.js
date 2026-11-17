import { CONFIG } from './config.js';
import { Rect } from './rect.js';
import { gravityAcceleration, segmentHitsCircle } from './physics.js';

export class Ball {
    constructor(x = CONFIG.WIDTH / 4, y = CONFIG.HEIGHT / 2) {
        this.x = x;
        this.y = y;
        this.vx = CONFIG.SERVE_VX;
        this.vy = CONFIG.SERVE_VY;
        this.radius = CONFIG.BALL_RADIUS;
        this.captured = false;
    }

    get rect() {
        return Rect.fromCircle(this.x, this.y, this.radius);
    }

    get speed() {
        return Math.hypot(this.vx, this.vy);
    }

    update(mass, hole) {
        const prevX = this.x;
        const prevY = this.y;

        const a = gravityAcceleration(this.x, this.y, hole.x, hole.y, mass);
        this.vx += a.x;
        this.vy += a.y;

        const speed = this.speed;
        if (speed > CONFIG.MAX_BALL_SPEED) {
            this.vx *= CONFIG.MAX_BALL_SPEED / speed;
            this.vy *= CONFIG.MAX_BALL_SPEED / speed;
        }

        this.x += this.vx;
        this.y += this.vy;

        this.captured = segmentHitsCircle(prevX, prevY, this.x, this.y, hole.x, hole.y);
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.vx = CONFIG.SERVE_VX;
        this.vy = CONFIG.SERVE_VY;
        this.captured = false;
    }
}
