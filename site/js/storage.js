/**
 * Чтение аномалий, которые администратор завёл в панели ЛР 6.
 *
 * Сайт не пишет в это хранилище — только читает. Ключ и формат те же,
 * что в `crud/js/store.js`, поэтому две страницы видят одни данные.
 */

export const STORAGE_KEY = 'orbital_pong_anomalies';

/** Аномалии по умолчанию — если админка ещё не открывалась. */
export function fallbackAnomalies() {
    return [
        { id: 'seed-black', name: 'Центральная чёрная дыра', type: 'black', x: 400, y: 300, mass: 10 },
        { id: 'seed-white', name: 'Белая дыра-отражатель', type: 'white', x: 190, y: 160, mass: 4 },
    ];
}

/** Привести запись к безопасному виду: только известные поля и типы. */
function normalize(raw, index) {
    if (raw === null || typeof raw !== 'object') return null;

    const x = Number(raw.x);
    const y = Number(raw.y);
    const mass = Number(raw.mass);

    return {
        id: typeof raw.id === 'string' ? raw.id : `anomaly-${index}`,
        name: typeof raw.name === 'string' ? raw.name : 'Без названия',
        type: raw.type === 'white' ? 'white' : 'black',
        x: Number.isFinite(x) ? x : 400,
        y: Number.isFinite(y) ? y : 300,
        mass: Number.isFinite(mass) && mass > 0 ? mass : 5,
    };
}

/**
 * Прочитать список аномалий из localStorage.
 * @returns {Array<{id:string,name:string,type:string,x:number,y:number,mass:number}>}
 */
export function loadAnomalies() {
    let parsed;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return fallbackAnomalies();
        parsed = JSON.parse(raw);
    } catch (error) {
        console.warn('Аномалии в localStorage повреждены, беру значения по умолчанию', error);
        return fallbackAnomalies();
    }

    if (!Array.isArray(parsed) || parsed.length === 0) return fallbackAnomalies();

    const list = parsed.map(normalize).filter(Boolean);
    return list.length > 0 ? list : fallbackAnomalies();
}

/** Подписаться на изменения хранилища из другой вкладки. */
export function watchAnomalies(callback) {
    window.addEventListener('storage', (event) => {
        if (event.key !== STORAGE_KEY) return;
        callback(loadAnomalies());
    });
}
