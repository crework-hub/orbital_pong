// Рендер таблицы, экранирование и инлайн-редактирование
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const TYPE_LABEL = { black: 'Чёрная дыра', white: 'Белая дыра' };

function fmtDate(iso) {
  const d = new Date(iso);
  return isNaN(d) ? '—' : d.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
}

function viewRow(a) {
  return `<tr data-id="${escapeHtml(a.id)}">
    <td>${escapeHtml(a.name)}</td>
    <td><span class="badge badge-${a.type === 'white' ? 'white' : 'black'}">${escapeHtml(TYPE_LABEL[a.type] ?? a.type)}</span></td>
    <td class="num">${escapeHtml(a.x)}</td>
    <td class="num">${escapeHtml(a.y)}</td>
    <td class="num">${escapeHtml(a.mass)}</td>
    <td class="date">${escapeHtml(fmtDate(a.createdAt))}</td>
    <td class="actions">
      <button class="btn btn-small" data-action="edit">Изменить</button>
      <button class="btn btn-small btn-danger" data-action="delete">Удалить</button>
    </td></tr>`;
}

function editRow(a, draft, errors) {
  const v = draft ?? a;
  const err = (f) => errors?.[f] ? `<div class="err">${escapeHtml(errors[f])}</div>` : '';
  const inv = (f) => errors?.[f] ? ' invalid' : '';
  return `<tr data-id="${escapeHtml(a.id)}" class="editing">
    <td><input class="in${inv('name')}" name="name" value="${escapeHtml(v.name)}" maxlength="40">${err('name')}</td>
    <td><select class="in${inv('type')}" name="type">
      <option value="black"${v.type === 'black' ? ' selected' : ''}>Чёрная</option>
      <option value="white"${v.type === 'white' ? ' selected' : ''}>Белая</option></select>${err('type')}</td>
    <td><input class="in${inv('x')}" name="x" type="number" step="any" value="${escapeHtml(v.x)}">${err('x')}</td>
    <td><input class="in${inv('y')}" name="y" type="number" step="any" value="${escapeHtml(v.y)}">${err('y')}</td>
    <td><input class="in${inv('mass')}" name="mass" type="number" step="any" value="${escapeHtml(v.mass)}">${err('mass')}</td>
    <td class="date">${escapeHtml(fmtDate(a.createdAt))}</td>
    <td class="actions">
      <button class="btn btn-small btn-ok" data-action="save">Сохранить</button>
      <button class="btn btn-small" data-action="cancel">Отмена</button>
    </td></tr>`;
}

export function readRowInputs(tr) {
  const get = (n) => tr.querySelector(`[name="${n}"]`).value;
  return { name: get('name'), type: get('type'), x: get('x'), y: get('y'), mass: get('mass') };
}

/** edit = { id, draft, errors } | null */
export function renderTable(tbody, rows, edit) {
  if (rows.length === 0) {
    tbody.innerHTML = `<tr class="empty"><td colspan="7">🌌 Аномалий не найдено. Добавьте новую или измените фильтры.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map((a) =>
    edit && edit.id === a.id ? editRow(a, edit.draft, edit.errors) : viewRow(a)).join('');
}
