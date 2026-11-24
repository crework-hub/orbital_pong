// Точка входа: таблица, форма, фильтры, делегирование кликов.
let items = loadAnomalies();
let editingId = null;

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function typeLabel(type) {
  return type === 'white' ? 'Белая дыра' : 'Чёрная дыра';
}

function filtered() {
  const query = document.getElementById('f-search').value.trim().toLowerCase();
  const minMass = Number(document.getElementById('f-mass').value);
  return items.filter(function (item) {
    const nameOk = item.name.toLowerCase().includes(query);
    const massOk = item.mass >= minMass;
    return nameOk && massOk;
  });
}

function viewRow(item) {
  return (
    '<tr data-id="' + item.id + '">' +
      '<td>' + escapeHtml(item.name) + '</td>' +
      '<td><span class="badge ' + item.type + '">' + typeLabel(item.type) + '</span></td>' +
      '<td>' + item.x + '</td>' +
      '<td>' + item.y + '</td>' +
      '<td>' + item.mass + '</td>' +
      '<td class="actions">' +
        '<button type="button" class="secondary btn-edit" data-id="' + item.id + '">Изменить</button>' +
        '<button type="button" class="danger btn-delete" data-id="' + item.id + '">Удалить</button>' +
      '</td>' +
    '</tr>'
  );
}

function editRow(item) {
  return (
    '<tr data-id="' + item.id + '" class="editing">' +
      '<td><input name="name" type="text" maxlength="30" value="' + escapeHtml(item.name) + '"><span class="err" data-err="name"></span></td>' +
      '<td><select name="type">' +
        '<option value="black"' + (item.type === 'black' ? ' selected' : '') + '>Чёрная дыра</option>' +
        '<option value="white"' + (item.type === 'white' ? ' selected' : '') + '>Белая дыра</option>' +
      '</select><span class="err" data-err="type"></span></td>' +
      '<td><input name="x" type="number" min="0" max="800" step="any" value="' + item.x + '"><span class="err" data-err="x"></span></td>' +
      '<td><input name="y" type="number" min="0" max="600" step="any" value="' + item.y + '"><span class="err" data-err="y"></span></td>' +
      '<td><input name="mass" type="number" min="0.1" max="1000" step="any" value="' + item.mass + '"><span class="err" data-err="mass"></span></td>' +
      '<td class="actions">' +
        '<button type="button" class="btn-save" data-id="' + item.id + '">Сохранить</button>' +
        '<button type="button" class="secondary btn-cancel" data-id="' + item.id + '">Отмена</button>' +
      '</td>' +
    '</tr>'
  );
}

function renderTable() {
  const list = filtered();
  const tbody = document.querySelector('#anomalies tbody');
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td class="empty" colspan="6">Ничего не найдено</td></tr>';
  } else {
    tbody.innerHTML = list.map(function (item) {
      return item.id === editingId ? editRow(item) : viewRow(item);
    }).join('');
  }
  document.getElementById('counter').textContent =
    'Показано ' + list.length + ' из ' + items.length;
}

function clearFormErrors(form) {
  form.querySelectorAll('.err').forEach(function (el) { el.textContent = ''; });
  form.querySelectorAll('.invalid').forEach(function (el) { el.classList.remove('invalid'); });
}

function showErrors(root, errors) {
  root.querySelectorAll('.err').forEach(function (el) { el.textContent = ''; });
  root.querySelectorAll('.invalid').forEach(function (el) { el.classList.remove('invalid'); });
  Object.keys(errors).forEach(function (field) {
    const errEl = root.querySelector('[data-err="' + field + '"]');
    const input = root.querySelector('[name="' + field + '"]');
    if (errEl) errEl.textContent = errors[field];
    if (input) input.classList.add('invalid');
  });
}

function readRowInputs(tr) {
  return {
    name: tr.querySelector('[name="name"]').value,
    type: tr.querySelector('[name="type"]').value,
    x: tr.querySelector('[name="x"]').value,
    y: tr.querySelector('[name="y"]').value,
    mass: tr.querySelector('[name="mass"]').value
  };
}

function commit(next) {
  items = next;
  saveAnomalies(items);
  renderTable();
}

document.getElementById('add-form').addEventListener('submit', function (event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const result = validateAnomaly(data);
  if (!result.valid) {
    showErrors(form, result.errors);
    return;
  }
  clearFormErrors(form);
  const record = {
    id: crypto.randomUUID(),
    name: result.value.name,
    type: result.value.type,
    x: result.value.x,
    y: result.value.y,
    mass: result.value.mass
  };
  commit(items.concat(record));
  form.reset();
});

document.querySelector('#anomalies tbody').addEventListener('click', function (event) {
  const btn = event.target.closest('button');
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.classList.contains('btn-edit')) {
    editingId = id;
    renderTable();
  } else if (btn.classList.contains('btn-cancel')) {
    editingId = null;
    renderTable();
  } else if (btn.classList.contains('btn-save')) {
    const tr = btn.closest('tr');
    const result = validateAnomaly(readRowInputs(tr));
    if (!result.valid) {
      showErrors(tr, result.errors);
      return;
    }
    editingId = null;
    commit(items.map(function (item) {
      if (item.id !== id) return item;
      return {
        id: item.id,
        name: result.value.name,
        type: result.value.type,
        x: result.value.x,
        y: result.value.y,
        mass: result.value.mass
      };
    }));
  } else if (btn.classList.contains('btn-delete')) {
    const item = items.find(function (entry) { return entry.id === id; });
    const title = item ? item.name : 'запись';
    if (!confirm('Удалить аномалию «' + title + '»?')) return;
    if (editingId === id) editingId = null;
    commit(items.filter(function (entry) { return entry.id !== id; }));
  }
});

const massSlider = document.getElementById('f-mass');
const massOutput = document.getElementById('f-mass-val');
massSlider.addEventListener('input', function () {
  massOutput.textContent = massSlider.value;
  // Если правили строку, а фильтр её спрятал — выходим из режима правки.
  const visible = filtered().some(function (item) { return item.id === editingId; });
  if (editingId && !visible) editingId = null;
  renderTable();
});

document.getElementById('f-search').addEventListener('input', function () {
  const visible = filtered().some(function (item) { return item.id === editingId; });
  if (editingId && !visible) editingId = null;
  renderTable();
});

renderTable();
