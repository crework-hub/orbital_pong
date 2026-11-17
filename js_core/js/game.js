import { CONFIG } from './config.js';
import { Ball } from './ball.js';
import { Paddle } from './paddle.js';
import { Field, Zone } from './field.js';
import { State, StateMachine } from './state.js';

const MAX_EVENTS = 200;

export class Game {
    constructor(level) {
        this.level = level;
        this.field = new Field(level);
        this.hole = this.field.hole;
        this.mass = level.black_hole.mass;

        const top = (level.window.height - CONFIG.PADDLE_HEIGHT) / 2;
        this.left = new Paddle(level.paddle_margin, top, this.field.height);
        this.right = new Paddle(this.field.width - level.paddle_margin - CONFIG.PADDLE_WIDTH,
                                top, this.field.height);
        this.ball = new Ball();
        this.serve();

        this.fsm = new StateMachine(State.MENU);
        this.leftScore = 0;
        this.rightScore = 0;
        this.frames = 0;
        this.events = [];
        this.lastHit = null;
    }

    get state() {
        return this.fsm.state;
    }

    serve() {
        this.ball.reset(this.field.width / 4, this.field.height / 2);
        this.lastHit = null;
    }

    addPoint(side) {
        if (side === 'left') this.leftScore += 1;
        else this.rightScore += 1;
    }

    pushEvent(type, data = {}) {
        this.events.push({ frame: this.frames, type, ...data });
        if (this.events.length > MAX_EVENTS) this.events.shift();
    }

    start() {
        if (this.fsm.is(State.PLAY)) this.fsm.go(State.MENU);
        this.leftScore = 0;
        this.rightScore = 0;
        this.frames = 0;
        this.serve();
        this.fsm.go(State.PLAY);
        this.pushEvent('start');
    }

    // --- шаг ---
    step(input = {}) {
        if (!this.fsm.is(State.PLAY)) return;
        this.frames += 1;

        if (input.leftUp) this.left.moveUp();
        if (input.leftDown) this.left.moveDown();
        if (input.rightUp) this.right.moveUp();
        if (input.rightDown) this.right.moveDown();

        const ball = this.ball;
        ball.update(this.mass, this.hole);
        if (this.field.bounceWalls(ball)) this.pushEvent('wall-bounce');

        if (ball.rect.colliderect(this.left.rect) && ball.vx < 0) {
            ball.vx = Math.abs(ball.vx);
            this.lastHit = 'left';
            this.pushEvent('paddle-hit', { side: 'left', y: ball.y });
        }
        if (ball.rect.colliderect(this.right.rect) && ball.vx > 0) {
            ball.vx = -Math.abs(ball.vx);
            this.lastHit = 'right';
            this.pushEvent('paddle-hit', { side: 'right', y: ball.y });
        }

        // --- дыра и голы ---
        if (ball.captured) {
            const winner = this.lastHit === null ? null : (this.lastHit === 'left' ? 'right' : 'left');
            if (winner) this.addPoint(winner);
            this.pushEvent('hole-catch', { winner, speed: ball.speed });
            this.serve();
        } else {
            const zone = this.field.locate(ball.x, ball.y, ball.radius);
            if (zone === Zone.LEFT_GOAL || zone === Zone.RIGHT_GOAL) {
                const side = zone === Zone.LEFT_GOAL ? 'right' : 'left';
                this.addPoint(side);
                this.pushEvent('goal', { side, y: ball.y, speed: ball.speed });
                this.serve();
            }
        }

        if (this.leftScore >= this.level.win_score || this.rightScore >= this.level.win_score) {
            this.fsm.go(State.OVER);
            this.pushEvent('game-over', { winner: this.leftScore > this.rightScore ? 'left' : 'right' });
        }
    }
}
