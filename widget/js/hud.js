/**
 * HUD: обновление уже существующих DOM-элементов страницы.
 *
 * Canvas рисует игру, а числа живут в обычном HTML — так их видно
 * в инспекторе и можно прочитать из консоли. Пересчёт идёт не каждый кадр,
 * а раз в 100 мс (FPS — раз в 500 мс), чтобы не дёргать layout на 60 Гц.
 */

import { gravityForce, distance } from '../../js_core/js/physics.js';

const STATE_LABELS = {
    MENU: 'МЕНЮ',
    PLAY: 'ИГРА',
    OVER: 'КОНЕЦ',
};

const STATE_COLORS = {
    MENU: '#59b7ff',
    PLAY: '#5dffa8',
    OVER: '#ff6b81',
};

/** Кэш элементов: getElementById на каждом кадре — лишняя работа. */
function elements() {
    return {
        speed: document.getElementById('hud-speed'),
        score: document.getElementById('hud-score'),
        state: document.getElementById('hud-state'),
        mass: document.getElementById('hud-mass'),
        fps: document.getElementById('hud-fps'),
        gravity: document.getElementById('hud-gravity'),
    };
}

export class Hud {
    constructor() {
        this.nodes = elements();
        this.lastTextUpdate = 0;
        this.lastFpsUpdate = 0;
        this.framesSinceFps = 0;
        this.fps = 0;
    }

    /** Считаем кадры — вызывается на каждом rAF. */
    countFrame() {
        this.framesSinceFps += 1;
    }

    /**
     * Обновить показатели, если прошло достаточно времени.
     * @param {number} now отметка performance.now()
     * @param {import('../../js_core/js/game.js').Game} game
     */
    update(now, game) {
        if (now - this.lastFpsUpdate >= 500) {
            const elapsed = now - this.lastFpsUpdate;
            this.fps = Math.round((this.framesSinceFps * 1000) / elapsed);
            this.framesSinceFps = 0;
            this.lastFpsUpdate = now;
            if (this.nodes.fps) this.nodes.fps.textContent = String(this.fps);
        }

        if (now - this.lastTextUpdate < 100) return;
        this.lastTextUpdate = now;

        const speed = game.ball.speed;
        const force = gravityForce(game.mass, distance(game.ball.x, game.ball.y, game.hole.x, game.hole.y));

        if (this.nodes.speed) this.nodes.speed.textContent = speed.toFixed(2);
        if (this.nodes.score) this.nodes.score.textContent = `${game.leftScore} : ${game.rightScore}`;
        if (this.nodes.mass) this.nodes.mass.textContent = String(Math.round(game.mass * 100) / 100);
        if (this.nodes.gravity) this.nodes.gravity.textContent = force.toFixed(2);

        if (this.nodes.state) {
            this.nodes.state.textContent = STATE_LABELS[game.state] || game.state;
            this.nodes.state.dataset.state = game.state;
            this.nodes.state.style.color = STATE_COLORS[game.state] || '#e6f0ff';
        }
    }
}
