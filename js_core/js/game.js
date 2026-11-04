/**
 * Игровое поле и цикл без отрисовки: ввод → обновление → проверка конца партии.
 * Этот класс используют и самопроверка, и веб-виджет из ЛР 5.
 */

import { CONFIG } from './config.js';
import { Ball, Paddle } from './bodies.js';
import { Field, Zone } from './field.js';
import { State, StateMachine } from './state.js';

export class Game {
    /**
     * @param {object} level уровень из level.js: {window, black_hole, paddle_margin, win_score}
     */
    constructor(level) {
        this.level = level;
        this.field = new Field(level);      // где что находится на поле
        this.hole = this.field.hole;
        this.mass = this.field.mass;

        this.ball = new Ball();
        this.left = new Paddle(level.paddle_margin, CONFIG.HEIGHT / 2 - CONFIG.PADDLE_HEIGHT / 2);
        this.right = new Paddle(level.window.width - level.paddle_margin - CONFIG.PADDLE_WIDTH,
                                CONFIG.HEIGHT / 2 - CONFIG.PADDLE_HEIGHT / 2);

        // Аномалии поля из панели ЛР 6: чёрные притягивают, белые отталкивают.
        this.anomalies = [];

        this.fsm = new StateMachine(State.MENU);
        this.leftScore = 0;
        this.rightScore = 0;
        this.events = [];       // «чёрный ящик»: что произошло
        this.goals = 0;
        this.frames = 0;
    }

    get state() {
        return this.fsm.state;
    }

    /** Начать партию: счёт с нуля, мяч в центре. */
    start() {
        this.leftScore = 0;
        this.rightScore = 0;
        this.goals = 0;
        this.frames = 0;
        this.ball.reset();
        this.fsm.go(State.PLAY);
        this.pushEvent('start');
    }

    pushEvent(type, data = {}) {
        this.events.push({ frame: this.frames, type, ...data });
        if (this.events.length > 200) this.events.shift();   // не растём бесконечно
    }

    /**
     * Один шаг симуляции. Ничего не рисует.
     * @param {{leftUp:boolean, leftDown:boolean, rightUp:boolean, rightDown:boolean}} input
     */
    step(input = {}) {
        if (!this.fsm.is(State.PLAY)) return;

        this.frames += 1;

        if (input.leftUp) this.left.moveUp();
        if (input.leftDown) this.left.moveDown();
        if (input.rightUp) this.right.moveUp();
        if (input.rightDown) this.right.moveDown();

        const bounced = this.ball.update(this.mass, this.hole, this.anomalies);
        if (bounced) this.pushEvent('wall-bounce');

        // Отскок от ракеток: меняем только горизонтальную скорость, как в ЛР 1.
        if (this.ball.rect.colliderect(this.left.rect) && this.ball.vx < 0) {
            this.ball.vx = Math.abs(this.ball.vx);
            this.pushEvent('paddle-hit', { side: 'left' });
        }
        if (this.ball.rect.colliderect(this.right.rect) && this.ball.vx > 0) {
            this.ball.vx = -Math.abs(this.ball.vx);
            this.pushEvent('paddle-hit', { side: 'right' });
        }

        // Мяч упал в чёрную дыру: очко тому, кто дальше, и подача заново.
        if (this.ball.fellIntoHole(this.hole)) {
            this.pushEvent('hole-catch', { speed: this.ball.speed });
            this.ball.reset();
            return;
        }

        // Мяч за линией ворот (зоны поля спрашиваем у Field, а не считаем вручную).
        const zone = this.field.locate(this.ball.x, this.ball.y, this.ball.radius);
        if (zone === Zone.LEFT_GOAL) {
            this.rightScore += 1;
            this.goals += 1;
            this.pushEvent('goal', { side: 'right', speed: this.ball.speed });
            this.ball.reset();
        } else if (zone === Zone.RIGHT_GOAL) {
            this.leftScore += 1;
            this.goals += 1;
            this.pushEvent('goal', { side: 'left', speed: this.ball.speed });
            this.ball.reset();
        }

        if (this.leftScore >= this.level.win_score || this.rightScore >= this.level.win_score) {
            this.fsm.go(State.OVER);
            this.pushEvent('game-over', {
                winner: this.leftScore > this.rightScore ? 'left' : 'right',
            });
        }
    }

    /** Сколько градусов мяч суммарно облетел вокруг дыры. */
    get orbitDegrees() {
        return Math.abs((this.ball.angle * 180) / Math.PI);
    }
}
