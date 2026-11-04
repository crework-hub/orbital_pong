// Работа с localStorage: загрузка, сохранение, демо-данные
export const STORAGE_KEY = 'orbital_pong_anomalies';

export function defaultAnomalies() {
  const now = new Date().toISOString();
  return [
    { id: crypto.randomUUID(), name: 'Центральная чёрная дыра', type: 'black', x: 400, y: 300, mass: 10, createdAt: now },
    { id: crypto.randomUUID(), name: 'Белая дыра-отражатель', type: 'white', x: 200, y: 150, mass: 4, createdAt: now },
  ];
}

export function loadAnomalies() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (e) {
    console.warn('Повреждённые данные в localStorage, восстанавливаю демо', e);
  }
  const seed = defaultAnomalies();
  saveAnomalies(seed);
  return seed;
}

export function saveAnomalies(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function resetAnomalies() {
  const seed = defaultAnomalies();
  saveAnomalies(seed);
  return seed;
}
