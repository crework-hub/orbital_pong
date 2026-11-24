// Хранилище аномалий. Ключ фиксированный, значение — JSON-массив.
// Аналог в Python: json.load / json.dump, только пишем не в файл, а в браузер.

const STORAGE_KEY = 'orbital_pong_anomalies';

function demoAnomalies() {
  return [
    { id: crypto.randomUUID(), name: 'Центральная чёрная дыра', type: 'black', x: 400, y: 300, mass: 10 },
    { id: crypto.randomUUID(), name: 'Белая дыра-отражатель', type: 'white', x: 200, y: 150, mass: 4 },
    { id: crypto.randomUUID(), name: 'Тяжёлая дыра у ворот', type: 'black', x: 650, y: 450, mass: 80 }
  ];
}

function loadAnomalies() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seed = demoAnomalies();
    saveAnomalies(seed);
    return seed;
  }
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) throw new Error('not array');
    return data;
  } catch (err) {
    const seed = demoAnomalies();
    saveAnomalies(seed);
    return seed;
  }
}

function saveAnomalies(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
