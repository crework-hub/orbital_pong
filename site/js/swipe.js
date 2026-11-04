/**
 * Свайпы по игровому полю (ЛР 7, требование варианта: на телефоне управление
 * ракеткой заменяется свайпами).
 *
 * Touch Events дают координаты касания в CSS-пикселях, а игра живёт в своих
 * 800×600, поэтому координату переводим через масштаб холста
 * (canvas.height / rect.height) — иначе на телефоне ракетка прыгала бы.
 */

import { CONFIG } from '../../js_core/js/config.js';

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} widget api виджета из mountWidget: {game, view}
 */
export function initSwipe(canvas, widget) {
    const { game, view } = widget;
    let touchId = null;

    /** Перевести clientY в игровую координату Y (0..600). */
    const toGameY = (clientY) => {
        const rect = canvas.getBoundingClientRect();
        if (rect.height === 0) return CONFIG.HEIGHT / 2;
        const scale = canvas.height / rect.height;
        return (clientY - rect.top) * scale;
    };

    /** Поставить центр ракетки под палец. */
    const movePaddle = (clientY) => {
        const target = toGameY(clientY) - CONFIG.PADDLE_HEIGHT / 2;
        const maxY = CONFIG.HEIGHT - CONFIG.PADDLE_HEIGHT;
        game.left.y = Math.max(0, Math.min(maxY, target));
        // Сбрасываем сглаживание, иначе ракетка «догоняет» палец с задержкой.
        view.leftY = game.left.y;
    };

    canvas.addEventListener('touchstart', (event) => {
        const touch = event.changedTouches[0];
        if (!touch) return;
        touchId = touch.identifier;
        event.preventDefault();          // свайп не прокручивает страницу
        movePaddle(touch.clientY);
    }, { passive: false });

    canvas.addEventListener('touchmove', (event) => {
        event.preventDefault();
        for (const touch of event.changedTouches) {
            if (touchId !== null && touch.identifier !== touchId) continue;
            movePaddle(touch.clientY);
        }
    }, { passive: false });

    const end = (event) => {
        for (const touch of event.changedTouches) {
            if (touch.identifier === touchId) touchId = null;
        }
    };
    canvas.addEventListener('touchend', end);
    canvas.addEventListener('touchcancel', end);
}
