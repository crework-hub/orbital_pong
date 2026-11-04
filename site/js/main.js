/**
 * Главная страница «Orbital Pong Arcade» (ЛР 7).
 *
 * Здесь только сборка: движок виджета из ЛР 5 (mountWidget), HUD сайта,
 * карточки аномалий из localStorage (ЛР 6), меню и свайпы. Игровой логики
 * в этом файле нет — она в ядре ЛР 4 и движке ЛР 5.
 */

import { mountWidget } from '../../widget/js/engine.js';
import { init as initScenarios, run, settings } from '../../widget/js/scenarios.js';
import { initNav } from './nav.js';
import { SiteHud } from './site-hud.js';
import { initSwipe } from './swipe.js';
import { loadAnomalies, watchAnomalies } from './storage.js';
import { renderCards, markSelected } from './anomaly-cards.js';

const canvas = document.getElementById('game');
const hud = new SiteHud();

const widget = mountWidget({
    canvas,
    hud,
    logElement: document.getElementById('scenario-log'),
});

// Реестр сценариев создаёт window.OP — тот же, что на странице ЛР 5.
window.OP = { ...(window.OP || {}), widget, run };
void initScenarios;

initNav();
initSwipe(canvas, widget);

/* ---------- Хотбар аномалий из localStorage (ЛР 6) ---------- */

const hotbar = document.getElementById('hotbar');
const hotbarHint = document.getElementById('hotbar-hint');
/** Какие аномалии сейчас включены в физике (по id). */
const active = new Set();
let cards = [];

function syncAnomaliesToEngine() {
    const list = loadAnomalies().filter((a) => active.has(a.id));
    widget.game.anomalies = list;
    if (hotbarHint) {
        hotbarHint.textContent = list.length === 0
            ? 'Включённых аномалий нет: на поле действует только центральная дыра.'
            : `Включено: ${list.map((a) => a.name).join(', ')}`;
    }
}

function buildHotbar() {
    const anomalies = loadAnomalies();
    const known = new Set(anomalies.map((a) => a.id));
    // Если аномалию удалили в админке — выключаем её и здесь.
    for (const id of [...active]) if (!known.has(id)) active.delete(id);

    cards = renderCards(hotbar, anomalies, (anomaly, card) => {
        if (active.has(anomaly.id)) active.delete(anomaly.id);
        else active.add(anomaly.id);

        markSelected(cards, active.has(anomaly.id) ? card : null);
        syncAnomaliesToEngine();
        run('showEvents');
    });

    for (const card of cards) {
        if (active.has(card.dataset.id)) card.classList.add('is-selected');
    }
    syncAnomaliesToEngine();
}

buildHotbar();
watchAnomalies(buildHotbar);

/* ---------- Кнопки управления ---------- */

const startBtn = document.getElementById('start-btn');
if (startBtn) startBtn.addEventListener('click', () => run('restart'));

const massDown = document.getElementById('mass-down');
const massUp = document.getElementById('mass-up');
if (massDown) massDown.addEventListener('click', () => run('setMass', Math.max(0.1, widget.game.mass - 5)));
if (massUp) massUp.addEventListener('click', () => run('setMass', widget.game.mass + 5));

const ringsBtn = document.getElementById('rings-btn');
if (ringsBtn) {
    ringsBtn.addEventListener('click', () => {
        run('toggleRings');
        ringsBtn.textContent = settings.rings ? 'Кольца: вкл' : 'Кольца: выкл';
    });
}

// Первая партия стартует сразу: на сайте не нужно искать пробел.
run('restart');
