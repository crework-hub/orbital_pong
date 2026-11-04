/**
 * Вызываемые сценарии ЛР 5.
 *
 * Сценарий — это именованная функция в реестре `scenarios`. Один и тот же
 * реестр дёргают три разные точки входа:
 *
 *   1) кнопки в HTML   — <button data-scenario="setMass" data-arg="25">;
 *   2) консоль браузера — OP.run('setMass', 25);
 *   3) внутренний код   — run('restart') по нажатию Space.
 *
 * Поэтому вся логика сценария живёт здесь, а не в обработчике кнопки.
 */

import { CONFIG, MAX_FORCE } from '../../js_core/js/config.js';
import { gravityForce } from '../../js_core/js/physics.js';
import { DEFAULT_VIEW_RADIUS } from './render.js';

/** Настройки, которые меняют сценарии и читает цикл отрисовки. */
export const settings = {
    mass: 10,                                   // масса дыры (копия game.mass для info)
    viewRadius: DEFAULT_VIEW_RADIUS,            // радиус видимости, px
    rings: true,                                // рисуются ли кольца
    timeScale: 1,                               // множитель хода времени
    ai: false,                                  // автопилот за левую ракетку
    ballBoost: 1,                               // множитель скорости подачи
    anomalies: [],                              // визуальные аномалии
};

/** Ссылки на объекты виджета; заполняются в init(). */
const ctx = {
    game: null,
    effects: null,
    trail: null,
    logElement: null,
    absorbUntil: 0,
    now: () => performance.now(),
};

/** Ограничить число диапазоном. */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/** Привести аргумент из HTML (строка) к числу. */
function num(value, fallback) {
    const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

/** Аргумент для лога: числа печатаем без кавычек, строки — в кавычках. */
function formatArg(value) {
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
        return String(Number(value));
    }
    return JSON.stringify(value);
}

/** Русское склонение: 1 событие, 2 события, 5 событий. */
function plural(count, one, few, many) {
    const mod100 = count % 100;
    const mod10 = count % 10;
    if (mod100 >= 11 && mod100 <= 14) return many;
    if (mod10 === 1) return one;
    if (mod10 >= 2 && mod10 <= 4) return few;
    return many;
}

/** Время в формате [21:04:12]. */
function stamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `[${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}]`;
}

/**
 * Строка в панель «Лог сценариев» и в консоль.
 * @param {string} text
 * @param {'info'|'error'} kind
 */
export function logLine(text, kind = 'info') {
    if (ctx.logElement) {
        const line = document.createElement('div');
        line.className = `log-line log-${kind}`;
        line.textContent = `${stamp()} ${text}`;
        ctx.logElement.append(line);
        ctx.logElement.scrollTop = ctx.logElement.scrollHeight;
        while (ctx.logElement.childElementCount > 120) {
            ctx.logElement.firstElementChild.remove();
        }
    }
    if (kind === 'error') console.warn(text);
    else console.log(text);
}

/* ------------------------------------------------------------------ */
/* Реестр сценариев                                                    */
/* ------------------------------------------------------------------ */

/**
 * Каждый сценарий возвращает короткую строку-результат:
 * она попадает в лог как «setMass(25) → масса 25».
 */
export const scenarios = {
    restart() {
        ctx.game.start();
        ctx.trail.length = 0;
        ctx.effects.clear();
        ctx.absorbUntil = 0;
        return 'партия начата заново';
    },

    setMass(value) {
        const mass = clamp(num(value, ctx.game.mass), 0.1, 1000);
        ctx.game.mass = mass;
        settings.mass = mass;
        return `масса ${mass}`;
    },

    setVisibility(px) {
        const radius = clamp(num(px, settings.viewRadius), 100, 800);
        settings.viewRadius = radius;
        return `радиус видимости ${radius} px`;
    },

    toggleRings(on) {
        settings.rings = on === undefined ? !settings.rings : Boolean(on);
        return settings.rings ? 'кольца включены' : 'кольца выключены';
    },

    slowMotion(k) {
        const scale = clamp(num(k, 1), 0.25, 2);
        settings.timeScale = scale;
        return `ход времени ×${scale}`;
    },

    fastBall(k) {
        const boost = clamp(num(k, 1), 1, 5);
        const ball = ctx.game.ball;
        ball.vx *= boost;
        ball.vy *= boost;
        settings.ballBoost = boost;
        return `скорость мяча ×${boost}`;
    },

    freezeBall() {
        const ball = ctx.game.ball;
        ball.vx = 0;
        ball.vy = 0;
        settings.ballBoost = 1;
        return 'мяч отпущен: падает в дыру под действием гравитации';
    },

    spawnAnomaly(type, x, y, mass) {
        const kind = type === 'white' ? 'white' : 'black';
        const px = clamp(num(x, CONFIG.WIDTH / 2), 0, CONFIG.WIDTH);
        const py = clamp(num(y, CONFIG.HEIGHT / 2), 0, CONFIG.HEIGHT);
        const m = clamp(num(mass, 5), 0.1, 1000);

        settings.anomalies.push({
            type: kind,
            x: px,
            y: py,
            mass: m,
            radius: 8 + Math.min(16, Math.log10(m + 1) * 6),
            phase: Math.random() * Math.PI * 2,
        });
        return `аномалия «${kind}» в (${Math.round(px)}, ${Math.round(py)}), масса ${m} — только вид`;
    },

    toggleAI() {
        settings.ai = !settings.ai;
        return settings.ai ? 'автопилот включён' : 'автопилот выключен';
    },

    showEvents() {
        const last = ctx.game.events.slice(-10);
        if (last.length === 0) {
            logLine('showEvents() → событий пока нет');
            return 'событий нет';
        }
        logLine(`showEvents() → последние ${last.length} ${plural(last.length, 'событие', 'события', 'событий')}:`);
        for (const event of last) {
            logLine(`  кадр ${event.frame}: ${event.type}` +
                    (event.side ? ` (${event.side})` : '') +
                    (event.speed !== undefined ? `, скорость ${event.speed.toFixed(2)}` : '') +
                    (event.winner ? ` (победил ${event.winner})` : ''));
        }
        return `${last.length} ${plural(last.length, 'событие', 'события', 'событий')} в логе`;
    },

    info() {
        const game = ctx.game;
        const force = gravityForce(
            game.mass,
            Math.hypot(game.ball.x - game.hole.x, game.ball.y - game.hole.y),
        );
        const data = {
            state: game.state,
            speed: Number(game.ball.speed.toFixed(3)),
            leftY: Number(game.left.y.toFixed(2)),
            mass: game.mass,
            viewRadius: settings.viewRadius,
            rings: settings.rings,
            timeScale: settings.timeScale,
            ai: settings.ai,
            anomalies: settings.anomalies.length,
            score: `${game.leftScore}:${game.rightScore}`,
            force: Number(force.toFixed(3)),
        };
        return data;
    },
};

/** Метаданные для панели кнопок и для list(). */
export const SCENARIO_DOCS = [
    { name: 'restart', signature: 'restart()', note: 'новая партия' },
    { name: 'setMass', signature: 'setMass(m)', note: 'масса дыры 0.1…1000' },
    { name: 'setVisibility', signature: 'setVisibility(px)', note: 'радиус видимости 100…800' },
    { name: 'toggleRings', signature: 'toggleRings(on?)', note: 'кольца пространства' },
    { name: 'slowMotion', signature: 'slowMotion(k)', note: 'время ×0.25…×2' },
    { name: 'fastBall', signature: 'fastBall(k)', note: 'скорость мяча ×1…×5' },
    { name: 'freezeBall', signature: 'freezeBall()', note: 'отпустить мяч в дыру' },
    { name: 'spawnAnomaly', signature: 'spawnAnomaly(type,x,y,m)', note: 'визуальная аномалия' },
    { name: 'toggleAI', signature: 'toggleAI()', note: 'автопилот слева' },
    { name: 'showEvents', signature: 'showEvents()', note: 'журнал событий ядра' },
];

/**
 * Выполнить сценарий по имени.
 * @returns {*} то, что вернул сценарий (для info() — объект)
 */
export function run(name, ...args) {
    const scenario = scenarios[name];
    if (typeof scenario !== 'function') {
        logLine(`run('${name}') → нет такого сценария. OP.list() покажет список`, 'error');
        return undefined;
    }

    let result;
    try {
        result = scenario(...args);
    } catch (error) {
        logLine(`run('${name}') → ошибка: ${error.message}`, 'error');
        return undefined;
    }

    // info() печатаем подробно, остальные — строкой «имя(аргументы) → результат».
    if (name === 'info') {
        const text = Object.entries(result).map(([key, value]) => `${key}=${value}`).join(', ');
        logLine(`info() → ${text}`);
        return result;
    }

    if (name === 'showEvents') return result;

    const call = args.length > 0
        ? `${name}(${args.map(formatArg).join(', ')})`
        : `${name}()`;
    logLine(`${call} → ${result}`);
    return result;
}

/** Список сценариев для консоли и для панели. */
export function list() {
    const rows = SCENARIO_DOCS.map((doc) => `  ${doc.signature.padEnd(28)} ${doc.note}`);
    const text = ['Доступные сценарии:', ...rows].join('\n');
    console.log(text);
    return SCENARIO_DOCS.map((doc) => doc.name);
}

/**
 * Подключить реестр к объектам виджета и повесить window.OP.
 * @param {object} context {game, effects, trail, logElement}
 */
export function init(context) {
    Object.assign(ctx, context);

    window.OP = {
        scenarios,
        run,
        list,
        info: () => run('info'),
    };

    logLine('виджет готов. Из консоли: OP.run(\'setMass\', 25), OP.list()');
}

/** Масса, при которой сила максимальна, — для подсказок в HUD. */
export const MAX_FORCE_AT = (mass) => MAX_FORCE(mass);
