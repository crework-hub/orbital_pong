/**
 * Мышь: перевод координат окна в координаты Canvas.
 *
 * Холст растягивается по ширине колонки (max-width: 100%), поэтому
 * clientX/clientY нельзя брать напрямую — их надо пересчитать через
 * getBoundingClientRect() и внутреннее разрешение 800×600.
 */

import { CONFIG } from '../../js_core/js/config.js';

/**
 * @param {HTMLCanvasElement} canvas
 * @param {MouseEvent} event
 * @returns {{x:number, y:number}} точка в системе координат холста
 */
export function canvasPoint(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
    };
}

/**
 * Подключить управление левой ракеткой мышью.
 * Ракетка ставится так, чтобы её центр оказался на высоте курсора.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {import('../../js_core/js/game.js').Game} game
 * @param {() => void} onChange вызывается после сдвига (сглаживание позиций)
 */
export function initMouse(canvas, game, onChange = () => {}) {
    canvas.addEventListener('mousemove', (event) => {
        const point = canvasPoint(canvas, event);
        const half = CONFIG.PADDLE_HEIGHT / 2;
        const maxY = CONFIG.HEIGHT - CONFIG.PADDLE_HEIGHT;
        game.left.y = Math.max(0, Math.min(maxY, point.y - half));
        onChange();
    });
}
