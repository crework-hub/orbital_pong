/**
 * Точка входа страницы ЛР 5.
 *
 * Вся логика живёт в engine.js (mountWidget), а здесь только: найти холст,
 * поднять виджет и повесить window.OP. Благодаря этому тот же движок
 * использует сайт из ЛР 7 — дублировать код не нужно.
 */

import { mountWidget } from './engine.js';

const canvas = document.getElementById('game');

const widget = mountWidget({
    canvas,
    logElement: document.getElementById('scenario-log'),
});

// Для консоли браузера: OP.run('setMass', 25), OP.list(), OP.info()
window.OP = {
    ...(window.OP || {}),
    widget,
    run: widget.run,
};

console.log('Orbital Pong widget: страница ЛР 5 готова');
