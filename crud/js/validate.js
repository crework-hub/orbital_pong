// Валидация полей аномалии. Возвращает { errors, value }.
export const LIMITS = { x: [0, 800], y: [0, 600], mass: [0.1, 1000], name: [2, 30] };
const NAME_RE = /^[\p{L}\d\s-]+$/u;

function num(raw, field, label, errors) {
  const s = String(raw ?? '').trim().replace(',', '.');
  if (s === '') { errors[field] = `${label}: обязательное поле`; return null; }
  const n = Number(s);
  const [min, max] = LIMITS[field];
  if (!Number.isFinite(n)) { errors[field] = `${label}: нужно число`; return null; }
  if (n < min || n > max) { errors[field] = `${label}: от ${min} до ${max}`; return null; }
  return n;
}

export function validateAnomaly(input) {
  const errors = {};
  const name = String(input.name ?? '').trim();
  const [nmin, nmax] = LIMITS.name;
  if (!name) errors.name = 'Название обязательно';
  else if (name.length < nmin || name.length > nmax) errors.name = `Длина от ${nmin} до ${nmax} символов`;
  else if (!NAME_RE.test(name)) errors.name = 'Только буквы, цифры, пробел и дефис';

  const type = input.type;
  if (type !== 'black' && type !== 'white') errors.type = 'Выберите тип';

  const x = num(input.x, 'x', 'X', errors);
  const y = num(input.y, 'y', 'Y', errors);
  const mass = num(input.mass, 'mass', 'Масса', errors);

  return { errors, valid: Object.keys(errors).length === 0, value: { name, type, x, y, mass } };
}
