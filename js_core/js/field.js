import { CONFIG } from './config.js';
import { insideHole, distance } from './physics.js';

export const Zone = Object.freeze({
    FIELD: 'field',
    HOLE: 'hole',
    TOP_WALL: 'top-wall',
    BOTTOM_WALL: 'bottom-wall',
    LEFT_GOAL: 'left-goal',
    RIGHT_GOAL: 'right-goal',
});

export class Field {
    constructor(level) {
        this.width = level.window.width;
        this.height = level.window.height;
        this.hole = { x: level.black_hole.x, y: level.black_hole.y };
    }

    // --- зоны ---
    locate(x, y, radius = CONFIG.BALL_RADIUS) {
        if (x < 0) return Zone.LEFT_GOAL;
        if (x > this.width) return Zone.RIGHT_GOAL;
        if (y - radius <= 0) return Zone.TOP_WALL;
        if (y + radius >= this.height) return Zone.BOTTOM_WALL;
        if (insideHole(x, y, this.hole.x, this.hole.y)) return Zone.HOLE;
        return Zone.FIELD;
    }

    distanceToHole(x, y) {
        return distance(x, y, this.hole.x, this.hole.y);
    }

    bounceWalls(ball) {
        const zone = this.locate(ball.x, ball.y, ball.radius);
        if (zone === Zone.TOP_WALL) {
            ball.y = ball.radius;
            ball.vy = Math.abs(ball.vy);
            return true;
        }
        if (zone === Zone.BOTTOM_WALL) {
            ball.y = this.height - ball.radius;
            ball.vy = -Math.abs(ball.vy);
            return true;
        }
        return false;
    }
}
