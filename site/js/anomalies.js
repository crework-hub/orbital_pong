/**
 * Страница «Аномалии»: тот же localStorage, что у админки ЛР 6.
 * Данные только читаются — редактирование живёт в админке.
 */

import { initNav } from './nav.js';
import { loadAnomalies, watchAnomalies } from './storage.js';
import { renderTiles } from './anomaly-cards.js';

const container = document.getElementById('cards');

function draw() {
    renderTiles(container, loadAnomalies());
}

initNav();
draw();
watchAnomalies(draw);
