/**
 * Карточки аномалий для хотбара (ЛР 7, пункт 4).
 *
 * Строки приходят из localStorage, то есть их писал кто-то другой, поэтому
 * имя вставляется только через textContent, а не через innerHTML: тег в имени
 * останется текстом и не выполнится (та же XSS-защита, что `escapeHtml` в ЛР 6,
 * но здесь надёжнее вообще не собирать HTML из данных).
 */

/**
 * Построить карточки в контейнере.
 * @param {HTMLElement} container
 * @param {Array<object>} anomalies
 * @param {(anomaly: object, card: HTMLElement) => void} onSelect
 * @returns {HTMLElement[]} созданные карточки
 */
export function renderCards(container, anomalies, onSelect) {
    container.textContent = '';

    if (anomalies.length === 0) {
        const note = document.createElement('p');
        note.className = 'empty-note';
        note.textContent = 'Аномалий нет. Добавьте их в админке — карточки появятся здесь.';
        container.append(note);
        return [];
    }

    const cards = anomalies.map((anomaly) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'anomaly-card';
        card.dataset.id = anomaly.id;
        card.dataset.type = anomaly.type;

        const dot = document.createElement('span');
        dot.className = 'dot';

        const name = document.createElement('span');
        name.className = 'name';
        name.textContent = anomaly.name;          // текст, не HTML — XSS не пройдёт

        const meta = document.createElement('span');
        meta.className = 'meta';
        meta.textContent = `${anomaly.type === 'white' ? 'Белая' : 'Чёрная'} · M = ${anomaly.mass}`;

        card.append(dot, name, meta);
        card.addEventListener('click', () => onSelect(anomaly, card));
        container.append(card);
        return card;
    });

    return cards;
}

/** Подсветить выбранную карточку и снять подсветку с остальных. */
export function markSelected(cards, selected) {
    for (const card of cards) {
        card.classList.toggle('is-selected', card === selected);
        card.setAttribute('aria-pressed', card === selected ? 'true' : 'false');
    }
}

/** Карточки для страницы инвентаря — плитки с описанием. */
export function renderTiles(container, anomalies) {
    container.textContent = '';

    if (anomalies.length === 0) {
        const note = document.createElement('p');
        note.className = 'empty-note';
        note.textContent = 'Пока пусто. Добавьте аномалии в админке.';
        container.append(note);
        return;
    }

    for (const anomaly of anomalies) {
        const tile = document.createElement('article');
        tile.className = 'anomaly-tile';
        tile.dataset.type = anomaly.type;

        const visual = document.createElement('div');
        visual.className = 'tile-visual';
        const glyph = document.createElement('span');
        glyph.className = 'glyph';
        visual.append(glyph);

        const title = document.createElement('h3');
        title.textContent = anomaly.name;

        const facts = document.createElement('div');
        facts.className = 'tile-facts';

        const kind = document.createElement('span');
        kind.textContent = anomaly.type === 'white' ? 'Белая дыра' : 'Чёрная дыра';

        const mass = document.createElement('span');
        const massValue = document.createElement('b');
        massValue.textContent = String(anomaly.mass);
        mass.append('масса ', massValue);

        const place = document.createElement('span');
        place.textContent = `(${Math.round(anomaly.x)}, ${Math.round(anomaly.y)})`;

        facts.append(kind, mass, place);
        tile.append(visual, title, facts);
        container.append(tile);
    }
}
