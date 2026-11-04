/**
 * Игровое поле: хранит уровень и умеет по координатам сказать,
 * где находится точка — в дыре, у стены, за воротами или просто в поле.
 *
 * Это тот самый «класс игрового поля» из этапа 4 задания: логика про зоны
 * поля собрана в одном месте, а не размазана по Game и Ball.
 */

import { CONFIG } from './config.js';
import { insideHole, distance } from './physics.js';

/** Возможные зоны поля. */
export const Zone = Object.freeze({
    FIELD: 'field',       // обычная точка в поле
    HOLE: 'hole',         // мяч упал в чёрную дыру
    TOP_WALL: 'top-wall', // упёрлись в верхнюю стену
    BOTTOM_WALL: 'bottom-wall',
    LEFT_GOAL: 'left-goal',   // мяч улетел за левые ворота
    RIGHT_GOAL: 'right-goal',
});

export class Field {
    /**
     * @param {object} level уровень из level.js
     */
    constructor(level) {
        this.level = level;
        this.hole = { x: level.black_hole.x, y: level.black_hole.y, mass: level.black_hole.mass };
        this.width = level.window.width;
        this.height = level.window.height;
    }

    /** Масса чёрной дыры — её же читает физика. */
    get mass() {
        return this.hole.mass;
    }

    /**
     * Где находится точка с учётом радиуса мяча.
     * @param {number} x
     * @param {number} y
     * @param {number} radius радиус мяча
     * @returns {string} одно из значений Zone
     */
    locate(x, y, radius = CONFIG.BALL_RADIUS) {
        // Ворота считаем по центру мяча: гол только когда он реально улетел за край.
        if (x < 0) return Zone.LEFT_GOAL;
        if (x > this.width) return Zone.RIGHT_GOAL;
        // Стены — с учётом радиуса: мяч касается края, а не пролетает сквозь.
        if (y - radius <= 0) return Zone.TOP_WALL;
        if (y + radius >= this.height) return Zone.BOTTOM_WALL;
        if (insideHole(x, y, this.hole.x, this.hole.y)) return Zone.HOLE;
        return Zone.FIELD;
    }

    /** Расстояние от точки до центра дыры — для HUD и отрисовки колец. */
    distanceToHole(x, y) {
        return distance(x, y, this.hole.x, this.hole.y);
    }

    /**
     * Отражение мяча от стен. Меняет переданный объект мяча и возвращает true,
     * если был отскок. Ворота не отражают — это гол.
     */
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
