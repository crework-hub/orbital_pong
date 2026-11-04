/**
 * Движок виджета ЛР 5: игровой цикл, связка «ввод → ядро → отрисовка».
 *
 * Этот файл — переиспользуемый модуль, а не страница. `mountWidget()` находит
 * элементы на странице, поднимает цикл и возвращает небольшой API. Поэтому
 * один и тот же виджет работает и на отдельной странице ЛР 5, и на главной
 * странице сайта ЛР 7 — логика не дублируется.
 *
 * Цикл построен на requestAnimationFrame, но ФИЗИКА идёт фиксированными шагами:
 * реальное время копится в аккумуляторе, и пока в нём набралось на шаг —
 * вызывается stepOnce(). Поэтому при 30 fps мяч летит с той же скоростью,
 * что и при 144 fps, просто шагов за кадр больше.
 */

import { CONFIG } from '../../js_core/js/config.js';
import { Game } from '../../js_core/js/game.js';
import { DEFAULT_LEVEL } from '../../js_core/js/level.js';
import { initInput, inputSnapshot } from './input.js';
import { initMouse } from './mouse.js';
import { EffectSystem } from './effects.js';
import { Hud } from './hud.js';
import {
    makeStars, pushTrail, render, snapshot, interpolate,
} from './render.js';
import { init as initScenarios, run, settings } from './scenarios.js';

/** Шаг симуляции: 60 шагов в секунду, 16.67 мс. */
export const FIXED_DT = 1000 / 60;

/** Больше 5 шагов за кадр не делаем: после сворачивания вкладки не «догоняем». */
export const MAX_STEPS_PER_FRAME = 5;

/** Порог, после которого разрыв времени считаем паузой вкладки. */
const MAX_FRAME_DELTA = 250;

/**
 * Поднять виджет на элементах страницы.
 *
 * @param {object} config
 * @param {HTMLCanvasElement} config.canvas холст 800×600
 * @param {Hud} [config.hud] готовый HUD (по умолчанию создаётся сам)
 * @param {HTMLElement} [config.logElement] панель «Лог сценариев»
 * @param {object} [config.level] уровень (по умолчанию из ядра)
 * @returns {object} api виджета: game, effects, scene, run, start…
 */
export function mountWidget(config) {
    const canvas = config.canvas;
    const ctx = canvas.getContext('2d');

    const game = new Game(config.level || DEFAULT_LEVEL);
    const effects = new EffectSystem();
    const hud = config.hud || new Hud();

    /** Сцена отрисовки: всё, что не является сущностью ядра. */
    const scene = {
        stars: makeStars(120),
        trail: [],
        time: 0,
        viewRadius: settings.viewRadius,
        rings: true,
        anomalies: settings.anomalies,
        absorbUntil: 0,
    };

    /** Сглаженные позиции для отрисовки (интерполяция между шагами). */
    const view = { ballX: game.ball.x, ballY: game.ball.y, leftY: game.left.y, rightY: game.right.y };
    let previous = snapshot(game);

    let accumulator = 0;
    let last = performance.now();
    let lastEventCount = 0;
    const processedEvents = new WeakSet();

    /* ------------------------------------------------------------------ */
    /* События ядра → эффекты                                              */
    /* ------------------------------------------------------------------ */

    /**
     * Разобрать новые события из game.events.
     *
     * Ядро копит события в массив и обрезает его до 200 штук, поэтому одного
     * счётчика мало: WeakSet страхует от повторной обработки после обрезки.
     */
    function drainEvents(now, ballBefore) {
        if (game.events.length < lastEventCount) lastEventCount = 0;

        for (let i = lastEventCount; i < game.events.length; i += 1) {
            const event = game.events[i];
            if (processedEvents.has(event)) continue;
            processedEvents.add(event);

            switch (event.type) {
                case 'paddle-hit': {
                    const x = event.side === 'left'
                        ? game.left.x + game.left.width
                        : game.right.x;
                    effects.spawn('spark', x, ballBefore.y, event.side === 'left' ? '#7ad9ff' : '#ff8ec4');
                    break;
                }
                case 'goal': {
                    // Событие приходит уже после подачи, поэтому Y берём из позиции до шага.
                    const x = event.side === 'right' ? 0 : CONFIG.WIDTH;
                    effects.spawn('shockwave', x, ballBefore.y, event.side === 'right' ? '#ff8ec4' : '#7ad9ff');
                    break;
                }
                case 'hole-catch':
                    effects.spawn('implosion', game.hole.x, game.hole.y, '#ffb347');
                    scene.absorbUntil = now + 900;
                    break;
                case 'game-over':
                    effects.spawn('shockwave', CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, '#ffd24d');
                    break;
                default:
                    break;   // wall-bounce и start эффектов не требуют
            }
        }

        lastEventCount = game.events.length;
    }

    /* ------------------------------------------------------------------ */
    /* Один фиксированный шаг                                              */
    /* ------------------------------------------------------------------ */

    function stepOnce(now) {
        const ballBefore = { x: game.ball.x, y: game.ball.y };

        // Ввод читаем из массива-флагов: цикл сам решает, что нажато сейчас.
        const input = inputSnapshot();

        // Автопилот за левую ракетку (сценарий toggleAI) подменяет клавиши.
        if (settings.ai && game.state === 'PLAY') game.left.track(game.ball.y);

        game.step(input);

        // ИИ правой ракетки: едет за мячом на каждом шаге, только в игре.
        if (game.state === 'PLAY') game.right.track(game.ball.y);

        drainEvents(now, ballBefore);
    }

    /* ------------------------------------------------------------------ */
    /* Кадр                                                                */
    /* ------------------------------------------------------------------ */

    function loop(now) {
        const delta = Math.min(now - last, MAX_FRAME_DELTA);
        last = now;
        scene.time = now;
        scene.viewRadius = settings.viewRadius;
        scene.rings = settings.rings;
        scene.anomalies = settings.anomalies;

        accumulator += delta;

        // slowMotion(k) растягивает шаг: при k = 0.5 шаг 33.3 мс, мир идёт вдвое медленнее.
        const stepInterval = FIXED_DT / settings.timeScale;

        previous = snapshot(game);
        let steps = 0;
        while (accumulator >= stepInterval && steps < MAX_STEPS_PER_FRAME) {
            stepOnce(now);
            accumulator -= stepInterval;
            steps += 1;
        }
        // Если мы упёрлись в потолок шагов — выкидываем долг, иначе цикл «залипнет».
        if (steps === MAX_STEPS_PER_FRAME && accumulator >= stepInterval) accumulator = 0;

        // alpha = 0…1 — доля незавершённого шага, по ней сглаживаем позиции.
        const alpha = Math.min(1, accumulator / stepInterval);
        interpolate(view, game, previous, alpha);

        if (game.state === 'PLAY') pushTrail(scene.trail, view.ballX, view.ballY);

        effects.update(delta);
        hud.countFrame();
        hud.update(now, game);

        render(ctx, scene, game, view, { effects });

        requestAnimationFrame(loop);
    }

    /* ------------------------------------------------------------------ */
    /* Старт                                                               */
    /* ------------------------------------------------------------------ */

    function startMatch() {
        if (game.state === 'PLAY') return;
        run('restart');
    }

    function wireButtons() {
        for (const button of document.querySelectorAll('[data-scenario]')) {
            button.addEventListener('click', () => {
                const name = button.dataset.scenario;
                const raw = button.dataset.arg;
                const args = raw === undefined || raw === ''
                    ? []
                    : raw.split(',').map((part) => part.trim()).filter((part) => part !== '');
                run(name, ...args);
            });
        }
    }

    /** Небольшой API для страницы: что можно подёргать снаружи. */
    const api = {
        game,
        effects,
        scene,
        view,
        settings,
        canvas,
        /** Запустить новую партию (то же, что сценарий restart). */
        start: () => run('restart'),
        /** Выполнить любой сценарий по имени. */
        run,
        /** Текущая масса дыры — для панели сайта. */
        get mass() { return game.mass; },
    };

    initInput((action) => {
        if (action === 'start') startMatch();
        else if (action === 'restart') run('restart');
    });

    initMouse(canvas, game, () => {
        // Мышь двигает ракетку мгновенно — сбрасываем базу интерполяции,
        // иначе ракетка будет «догонять» курсор с задержкой в один кадр.
        previous.leftY = game.left.y;
        view.leftY = game.left.y;
    });

    initScenarios({
        game,
        effects,
        trail: scene.trail,
        logElement: config.logElement || document.getElementById('scenario-log'),
    });

    wireButtons();

    // Первый кадр рисуем сразу, чтобы поле не было пустым до старта партии.
    render(ctx, scene, game, view, { effects });
    requestAnimationFrame(loop);

    console.log('Orbital Pong widget: модули загружены, шаг 16.67 мс');

    return api;
}
