import { CONFIG } from './config.js';
import { Rect } from './rect.js';

export class Paddle {
    constructor(x, y, fieldHeight = CONFIG.HEIGHT) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.PADDLE_WIDTH;
        this.height = CONFIG.PADDLE_HEIGHT;
        this.speed = CONFIG.PADDLE_SPEED;
        this.fieldHeight = fieldHeight;
    }

    get rect() {
        return new Rect(this.x, this.y, this.width, this.height);
    }

    moveUp() {
        this.y = Math.max(0, this.y - this.speed);
    }

    moveDown() {
        this.y = Math.min(this.fieldHeight - this.height, this.y + this.speed);
    }

    setCenter(y) {
        this.y = Math.max(0, Math.min(this.fieldHeight - this.height, y - this.height / 2));
    }

    track(targetY) {
        const target = targetY - this.height / 2;
        if (this.y < target - 1) this.moveDown();
        else if (this.y > target + 1) this.moveUp();
    }
}
