import { Game } from '../../js_core/js/game.js';
import { DEFAULT_LEVEL } from '../../js_core/js/level.js';
import { gravityForce, distance } from '../../js_core/js/physics.js';
import { EffectSystem } from './effects.js';
import { makeStars, render } from './render.js';
import { createScenarios } from './scenarios.js';

const FIXED_DT = 1000 / 60;
const MAX_STEPS_PER_FRAME = 5;
const MAX_FRAME_DELTA = 250;
const TRAIL_LENGTH = 18;

const STATE_LABELS = { MENU: 'меню', PLAY: 'игра', OVER: 'конец' };
const GAME_KEYS = ['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS', 'Space'];

// --- ввод: массив-флаги ---
const keys = {};

function isDown(...codes) {
    return codes.some((code) => keys[code] === true);
}

function readInput() {
    return { leftUp: isDown('KeyW', 'ArrowUp'), leftDown: isDown('KeyS', 'ArrowDown') };
}

export function mountWidget({ canvas, logElement }) {
    const ctx = canvas.getContext('2d');
    const game = new Game(DEFAULT_LEVEL);
    const effects = new EffectSystem();

    const scene = {
        stars: makeStars(80, canvas.width, canvas.height),
        trail: [],
        time: 0,
        settings: { viewRadius: 1000, rings: true, timeScale: 1, autopilot: false },
    };
    const scenarios = createScenarios({ game, effects, scene, logElement });

    const hud = {
        speed: document.getElementById('hud-speed'),
        score: document.getElementById('hud-score'),
        state: document.getElementById('hud-state'),
        mass: document.getElementById('hud-mass'),
        gravity: document.getElementById('hud-gravity'),
        fps: document.getElementById('hud-fps'),
    };

    // --- события ядра → эффекты ---
    let handled = 0;

    function spawnEffects() {
        if (game.events.length < handled) handled = 0;
        for (const event of game.events.slice(handled)) {
            if (event.type === 'paddle-hit') {
                const paddle = event.side === 'left' ? game.left : game.right;
                const x = event.side === 'left' ? paddle.x + paddle.width : paddle.x;
                effects.spawn('spark', x, event.y, '#ffffff');
                effects.spawn('marker', paddle.x + paddle.width / 2, paddle.y, '#ffd24d');
            } else if (event.type === 'goal') {
                const x = event.side === 'right' ? 0 : game.field.width;
                effects.spawn('shockwave', x, event.y, event.side === 'right' ? '#ff8ec4' : '#7ad9ff');
            } else if (event.type === 'hole-catch') {
                effects.spawn('implosion', game.hole.x, game.hole.y, '#ffb347');
                effects.spawn('marker', game.hole.x, game.hole.y - 14, '#ffb347');
            } else if (event.type === 'game-over') {
                effects.spawn('shockwave', game.field.width / 2, game.field.height / 2, '#ffd24d');
            }
        }
        handled = game.events.length;
    }

    // --- фиксированный шаг ---
    function stepOnce() {
        if (scene.settings.autopilot && game.state === 'PLAY') game.left.track(game.ball.y);
        if (game.state === 'PLAY') game.right.track(game.ball.y);

        game.step(readInput());

        if (game.state === 'PLAY') {
            scene.trail.push({ x: game.ball.x, y: game.ball.y });
            if (scene.trail.length > TRAIL_LENGTH) scene.trail.shift();
        }
        spawnEffects();
    }

    // --- HUD ---
    let frames = 0;
    let fpsStart = performance.now();

    function updateHud(now) {
        const { ball } = game;
        const force = gravityForce(game.mass, distance(ball.x, ball.y, game.hole.x, game.hole.y));
        hud.speed.textContent = ball.speed.toFixed(2);
        hud.score.textContent = `${game.leftScore} : ${game.rightScore}`;
        hud.state.textContent = STATE_LABELS[game.state];
        hud.state.dataset.state = game.state;
        hud.mass.textContent = String(game.mass);
        hud.gravity.textContent = force.toFixed(2);

        frames += 1;
        if (now - fpsStart >= 500) {
            hud.fps.textContent = String(Math.round((frames * 1000) / (now - fpsStart)));
            frames = 0;
            fpsStart = now;
        }
    }

    // --- цикл ---
    let accumulator = 0;
    let last = performance.now();

    function loop(now) {
        const delta = Math.min(now - last, MAX_FRAME_DELTA);
        last = now;
        scene.time = now;

        const interval = FIXED_DT / scene.settings.timeScale;
        accumulator += delta;
        let steps = 0;
        while (accumulator >= interval && steps < MAX_STEPS_PER_FRAME) {
            stepOnce();
            accumulator -= interval;
            steps += 1;
        }
        if (steps === MAX_STEPS_PER_FRAME) accumulator = 0;

        effects.update(delta);
        updateHud(now);
        render(ctx, scene, game, effects);
        requestAnimationFrame(loop);
    }

    // --- клавиатура и мышь ---
    window.addEventListener('keydown', (event) => {
        if (GAME_KEYS.includes(event.code)) event.preventDefault();
        keys[event.code] = true;
        if (event.repeat) return;
        if (event.code === 'Space' && game.state !== 'PLAY') scenarios.run('restart');
        if (event.code === 'KeyR') scenarios.run('restart');
    });
    window.addEventListener('keyup', (event) => {
        keys[event.code] = false;
    });
    window.addEventListener('blur', () => {
        for (const code of Object.keys(keys)) keys[code] = false;
    });

    canvas.addEventListener('mousemove', (event) => {
        const box = canvas.getBoundingClientRect();
        game.left.setCenter(((event.clientY - box.top) * canvas.height) / box.height);
    });

    for (const button of document.querySelectorAll('[data-scenario]')) {
        button.addEventListener('click', () => {
            const arg = button.dataset.arg;
            scenarios.run(button.dataset.scenario, ...(arg ? [arg] : []));
        });
    }

    requestAnimationFrame(loop);
    return { game, effects, scene, ...scenarios };
}

const widget = mountWidget({
    canvas: document.getElementById('game'),
    logElement: document.getElementById('scenario-log'),
});

window.OP = { widget, run: widget.run, list: widget.list, info: widget.info };
