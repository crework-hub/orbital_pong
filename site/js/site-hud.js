/**
 * HUD сайта (ЛР 7, пункт 6).
 *
 * Интерфейс совпадает с `widget/js/hud.js`: у класса те же два метода
 * `countFrame()` и `update(now, game)`, поэтому движок виджета вообще не знает,
 * куда он пишет — в панель ЛР 5 или в полосу сайта. Меняются только элементы.
 *
 * Вид индикатора меняется в реальном времени:
 *   — полоса скорости растёт с разгоном мяча и краснеет на высокой скорости;
 *   — «пилюля» состояния меняет цвет и подпись;
 *   — масса дыры показывает текущее значение.
 */

import { gravityForce, distance } from '../../js_core/js/physics.js';

const STATE_TEXT = {
    MENU: 'МЕНЮ',
    PLAY: 'ИГРА',
    OVER: 'КОНЕЦ',
};

const STATE_HINT = {
    MENU: 'Пробел — начать партию',
    PLAY: 'W/S, стрелки или мышь',
    OVER: 'Пробел — новая партия',
};

/** Скорость, при которой полоса считается «опасной». */
const DANGER_SPEED = 12;

/** Скорость, на которую рассчитана полная шкала. */
const FULL_SPEED = 20;

export class SiteHud {
    constructor(root = document) {
        this.speed = root.getElementById('speed-value');
        this.bar = root.getElementById('speed-bar');
        this.barFill = this.bar ? this.bar.querySelector('span') : null;
        this.score = root.getElementById('score-value');
        this.pill = root.getElementById('state-pill');
        this.hint = root.getElementById('state-hint');
        this.mass = root.getElementById('mass-value');
        this.fps = root.getElementById('fps-value');

        this.frames = 0;
        this.lastFps = 0;
        this.lastUpdate = 0;
        this.lastSpeedText = '';
        this.lastState = '';
    }

    countFrame() {
        this.frames += 1;
    }

    /**
     * @param {number} now performance.now()
     * @param {import('../../js_core/js/game.js').Game} game
     */
    update(now, game) {
        if (now - this.lastFps >= 500) {
            const fps = Math.round((this.frames * 1000) / Math.max(1, now - this.lastFps));
            this.frames = 0;
            this.lastFps = now;
            if (this.fps) this.fps.textContent = String(fps);
        }

        if (now - this.lastUpdate < 100) return;
        this.lastUpdate = now;

        const speed = game.ball.speed;
        const speedText = speed.toFixed(2);
        if (this.speed && speedText !== this.lastSpeedText) {
            this.speed.textContent = speedText;
            this.lastSpeedText = speedText;
        }

        if (this.barFill) {
            const ratio = Math.min(1, speed / FULL_SPEED);
            this.barFill.style.width = `${(ratio * 100).toFixed(1)}%`;
            this.bar.classList.toggle('is-danger', speed >= DANGER_SPEED);
        }

        if (this.score) this.score.textContent = `${game.leftScore} : ${game.rightScore}`;

        if (game.state !== this.lastState) {
            this.lastState = game.state;
            if (this.pill) {
                this.pill.textContent = STATE_TEXT[game.state] || game.state;
                this.pill.dataset.state = game.state;
            }
            if (this.hint) this.hint.textContent = STATE_HINT[game.state] || '';
        }

        if (this.mass) {
            const mass = Math.round(game.mass * 100) / 100;
            this.mass.textContent = String(mass);
            // Подсказка о силе у мяча — держим в title, чтобы не плодить блоки.
            this.mass.title = `Сила у мяча: ${gravityForce(mass, distance(game.ball.x, game.ball.y, game.hole.x, game.hole.y)).toFixed(2)}`;
        }
    }
}
