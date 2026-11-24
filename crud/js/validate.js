// Правила полей. Одна функция и для формы создания, и для правки строки.
const LIMITS = { name: [2, 30], x: [0, 800], y: [0, 600], mass: [0.1, 1000] };
const NAME_RE = /^[\p{L}\d\s-]+$/u;

function parseNumber(raw, field, label, errors) {
  const text = String(raw ?? '').trim().replace(',', '.');
  if (text === '') {
    errors[field] = label + ': обязательное поле';
    return null;
  }
  const value = Number(text);
  const min = LIMITS[field][0];
  const max = LIMITS[field][1];
  if (!Number.isFinite(value)) {
    errors[field] = label + ': нужно число';
    return null;
  }
  if (value < min || value > max) {
    errors[field] = label + ': от ' + min + ' до ' + max;
    return null;
  }
  return value;
}

function validateAnomaly(input) {
  const errors = {};
  const name = String(input.name ?? '').trim();
  const minLen = LIMITS.name[0];
  const maxLen = LIMITS.name[1];

  if (!name) {
    errors.name = 'Название обязательно';
  } else if (name.length < minLen || name.length > maxLen) {
    errors.name = 'Длина от ' + minLen + ' до ' + maxLen + ' символов';
  } else if (!NAME_RE.test(name)) {
    errors.name = 'Только буквы, цифры, пробел и дефис';
  }

  const type = input.type;
  if (type !== 'black' && type !== 'white') {
    errors.type = 'Выберите тип';
  }

  const x = parseNumber(input.x, 'x', 'X', errors);
  const y = parseNumber(input.y, 'y', 'Y', errors);
  const mass = parseNumber(input.mass, 'mass', 'Масса', errors);

  return {
    valid: Object.keys(errors).length === 0,
    errors: errors,
    value: { name: name, type: type, x: x, y: y, mass: mass }
  };
}
