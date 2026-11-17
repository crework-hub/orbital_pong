import { CONFIG } from './config.js';

export const DEFAULT_LEVEL = Object.freeze({
    window: { width: CONFIG.WIDTH, height: CONFIG.HEIGHT },
    black_hole: { x: CONFIG.WIDTH / 2, y: CONFIG.HEIGHT / 2, mass: 10 },
    paddle_margin: CONFIG.PADDLE_MARGIN,
    win_score: CONFIG.WIN_SCORE,
});

const RULES = [
    ['window.width', 400, 1920],
    ['window.height', 300, 1080],
    ['black_hole.x', 0, 100000],
    ['black_hole.y', 0, 100000],
    ['black_hole.mass', 0.1, 1000],
    ['paddle_margin', 0, 200],
    ['win_score', 1, 20],
];

function copyDefault() {
    return JSON.parse(JSON.stringify(DEFAULT_LEVEL));
}

function readPath(source, path) {
    let node = source;
    for (const key of path.split('.')) {
        if (node === null || typeof node !== 'object' || !(key in node)) return undefined;
        node = node[key];
    }
    return node;
}

function writePath(target, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    let node = target;
    for (const key of keys) node = node[key];
    node[last] = value;
}

// --- проверка полей ---
export function validateLevel(raw) {
    const level = copyDefault();
    const errors = [];

    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
        return { level, errors: ['корень файла должен быть объектом'] };
    }

    for (const [path, min, max] of RULES) {
        const value = readPath(raw, path);
        if (value === undefined) {
            errors.push(`нет поля '${path}'`);
        } else if (typeof value !== 'number' || !Number.isFinite(value)) {
            errors.push(`поле '${path}' должно быть числом`);
        } else if (value < min || value > max) {
            errors.push(`поле '${path}' вне диапазона ${min}..${max}`);
        } else {
            writePath(level, path, value);
        }
    }

    const { window, black_hole: hole } = level;
    if (hole.x <= 0 || hole.x >= window.width || hole.y <= 0 || hole.y >= window.height) {
        errors.push('чёрная дыра вне поля, ставлю её в центр');
        hole.x = window.width / 2;
        hole.y = window.height / 2;
    }

    return { level, errors };
}

// --- загрузка из текста ---
export function loadLevelFromText(text) {
    let raw;
    try {
        raw = JSON.parse(text);
    } catch (error) {
        return { level: copyDefault(), errors: [`JSON не разобран: ${error.message}`] };
    }
    return validateLevel(raw);
}
