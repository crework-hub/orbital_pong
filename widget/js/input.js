/**
 * Клавиатура виджета.
 *
 * Ключевая идея ЛР 5: состояние клавиш хранится не в отдельных переменных,
 * а в МАССИВЕ-ФЛАГАХ, проиндексированном по event.code:
 *
 *     keys['KeyW'] = true   — клавиша зажата
 *     keys['KeyW'] = false  — отпущена
 *
 * Игровой цикл раз в шаг просто читает флаги. Никакой логики в обработчиках —
 * они только выставляют флаг и гасят действие браузера по умолчанию.
 */

/** Массив-флаги: индекс — event.code, значение — зажата ли клавиша. */
export const keys = [];

/** Клавиши, для которых глушим поведение браузера (скролл страницы, пробел). */
const PREVENT_DEFAULT = new Set([
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'Space', 'KeyW', 'KeyS',
]);

/** Одиночные нажатия (не автоповтор): одно нажатие — одно действие. */
const ACTIONS = {
    Space: 'start',
    KeyR: 'restart',
};

let onAction = () => {};

/**
 * Подписать обработчики.
 * @param {(action: 'start'|'restart') => void} handler
 */
export function initInput(handler = () => {}) {
    onAction = handler;
    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearKeys);
}

function onKeyDown(event) {
    if (PREVENT_DEFAULT.has(event.code)) event.preventDefault();

    keys[event.code] = true;

    const action = ACTIONS[event.code];
    // event.repeat отсекает автоповтор: удержание Space не перезапускает партию.
    if (action && !event.repeat) onAction(action);
}

function onKeyUp(event) {
    if (PREVENT_DEFAULT.has(event.code)) event.preventDefault();
    keys[event.code] = false;
}

/** Сброс всех флагов — вызывается при потере фокуса окна. */
export function clearKeys() {
    for (const code of Object.keys(keys)) keys[code] = false;
}

/** Зажата ли хотя бы одна из клавиш. */
export function isDown(...codes) {
    return codes.some((code) => keys[code] === true);
}

/**
 * Снимок ввода для одного шага симуляции — ровно тот формат,
 * который ждёт Game.step() из ядра ЛР 4.
 */
export function inputSnapshot() {
    return {
        leftUp: isDown('KeyW', 'ArrowUp'),
        leftDown: isDown('KeyS', 'ArrowDown'),
        // Правой ракеткой управляет ИИ, поэтому её флаги всегда false.
        rightUp: false,
        rightDown: false,
    };
}
