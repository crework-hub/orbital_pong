/**
 * Загрузка уровня из JSON с валидацией.
 * Если файл битый или поля неверные — берём значения по умолчанию,
 * игра не падает.
 */

import { CONFIG } from './config.js';

export const DEFAULT_LEVEL = Object.freeze({
    window: { width: CONFIG.WIDTH, height: CONFIG.HEIGHT },
    black_hole: { x: CONFIG.WIDTH / 2, y: CONFIG.HEIGHT / 2, mass: 10 },
    paddle_margin: CONFIG.PADDLE_MARGIN,
    win_score: CONFIG.WIN_SCORE,
});

/**
 * Проверяет один числовой параметр.
 * @returns {{value:number, error:string|null}}
 */
function readNumber(source, path, min, max, fallback) {
    let node = source;
    for (const key of path) {
        if (node === null || typeof node !== 'object' || !(key in node)) {
            return { value: fallback, error: `нет поля '${path.join('.')}'` };
        }
        node = node[key];
    }

    if (typeof node !== 'number' || !Number.isFinite(node)) {
        return { value: fallback, error: `поле '${path.join('.')}' должно быть числом` };
    }
    if (node < min || node > max) {
        return { value: fallback, error: `поле '${path.join('.')}' вне диапазона ${min}..${max}` };
    }
    return { value: node, error: null };
}

/**
 * Валидирует объект уровня.
 * @returns {{level:object, errors:string[]}}
 */
export function validateLevel(raw) {
    const errors = [];
    const fallback = JSON.parse(JSON.stringify(DEFAULT_LEVEL));

    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
        return { level: fallback, errors: ['корень файла должен быть объектом'] };
    }

    const window = raw.window ?? {};
    const width = readNumber(window, ['width'], 400, 1920, fallback.window.width);
    const height = readNumber(window, ['height'], 300, 1080, fallback.window.height);
    if (width.error) errors.push(width.error);
    if (height.error) errors.push(height.error);

    const hole = raw.black_hole ?? {};
    const holeX = readNumber(hole, ['x'], 0, 100000, fallback.black_hole.x);
    const holeY = readNumber(hole, ['y'], 0, 100000, fallback.black_hole.y);
    const holeMass = readNumber(hole, ['mass'], 0.1, 1000, fallback.black_hole.mass);
    if (holeX.error) errors.push(holeX.error);
    if (holeY.error) errors.push(holeY.error);
    if (holeMass.error) {
        errors.push(holeMass.error);
    }
    // Дыра должна быть внутри поля, иначе притягивать будет «за экраном».
    if (holeX.value <= 0 || holeX.value >= width.value ||
        holeY.value <= 0 || holeY.value >= height.value) {
        errors.push('чёрная дыра вне поля, ставлю её в центр');
        holeX.value = width.value / 2;
        holeY.value = height.value / 2;
    }

    const margin = readNumber(raw, ['paddle_margin'], 0, 200, fallback.paddle_margin);
    const winScore = readNumber(raw, ['win_score'], 1, 20, fallback.win_score);
    if (margin.error) errors.push(margin.error);
    if (winScore.error) errors.push(winScore.error);

    return {
        level: {
            window: { width: width.value, height: height.value },
            black_hole: { x: holeX.value, y: holeY.value, mass: holeMass.value },
            paddle_margin: margin.value,
            win_score: winScore.value,
        },
        errors,
    };
}

/**
 * Разбирает JSON-строку в уровень. Любая ошибка — исключение не летит наружу.
 * @returns {{level:object, errors:string[]}}
 */
export function loadLevelFromText(text) {
    let raw;
    try {
        raw = JSON.parse(text);
    } catch (error) {
        return {
            level: JSON.parse(JSON.stringify(DEFAULT_LEVEL)),
            errors: [`JSON не разобран: ${error.message}`],
        };
    }
    return validateLevel(raw);
}
