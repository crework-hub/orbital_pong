// Точка входа: состояние, обработчики, фильтры
import { loadAnomalies, saveAnomalies, resetAnomalies } from './store.js';
import { validateAnomaly } from './validate.js';
import { renderTable, readRowInputs, escapeHtml } from './table.js';
import { renderPreview } from './render.js';

window.escapeHtml = escapeHtml; // для проверки из консоли

let anomalies = loadAnomalies();
let edit = null; // { id, draft, errors }

const $ = (s) => document.querySelector(s);
const form = $('#add-form');
const tbody = $('#tbody');
const fMass = $('#f-mass'), fMassNum = $('#f-mass-num'), fSearch = $('#f-search'), fType = $('#f-type');

function filtered() {
  const min = Number(fMassNum.value) || 0;
  const q = fSearch.value.trim().toLowerCase();
  const t = fType.value;
  return anomalies.filter((a) => a.mass >= min
    && (t === 'all' || a.type === t)
    && (!q || a.name.toLowerCase().includes(q)));
}

function toast(msg, kind = 'ok') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = `toast show ${kind}`;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.className = 'toast'; }, 2200);
}

function commit() {
  saveAnomalies(anomalies);
  render();
}

function render() {
  const rows = filtered();
  renderTable(tbody, rows, edit);
  $('#counter').textContent = `Показано ${rows.length} из ${anomalies.length}`;
  renderPreview($('#preview'), anomalies);
}

function showFormErrors(errors) {
  for (const f of ['name', 'type', 'x', 'y', 'mass']) {
    const input = form.elements[f];
    const box = form.querySelector(`[data-err="${f}"]`);
    box.textContent = errors[f] ?? '';
    input.classList.toggle('invalid', Boolean(errors[f]));
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const { valid, errors, value } = validateAnomaly(data);
  showFormErrors(errors);
  if (!valid) { toast('Исправьте ошибки в форме', 'err'); return; }
  anomalies.push({ id: crypto.randomUUID(), ...value, createdAt: new Date().toISOString() });
  form.reset();
  commit();
  toast(`Добавлено: ${value.name}`);
});

tbody.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const tr = btn.closest('tr');
  const id = tr.dataset.id;
  const item = anomalies.find((a) => a.id === id);
  if (!item) return;
  const action = btn.dataset.action;

  if (action === 'edit') {
    if (edit && edit.id !== id) {
      // Блокируем: не теряем несохранённые правки другой строки
      toast('Сначала сохраните или отмените текущее редактирование', 'err');
      return;
    }
    edit = { id, draft: null, errors: null };
    render();
  } else if (action === 'cancel') {
    edit = null; render();
  } else if (action === 'save') {
    const draft = readRowInputs(tr);
    const { valid, errors, value } = validateAnomaly(draft);
    if (!valid) { edit = { id, draft, errors }; render(); toast('Запись не изменена: есть ошибки', 'err'); return; }
    Object.assign(item, value);
    edit = null;
    commit();
    toast(`Сохранено: ${value.name}`);
  } else if (action === 'delete') {
    if (!confirm(`Удалить аномалию «${item.name}»?`)) return;
    anomalies = anomalies.filter((a) => a.id !== id);
    if (edit?.id === id) edit = null;
    commit();
    toast(`Удалено: ${item.name}`);
  }
});

// Синхронизация ползунка и числа
fMass.addEventListener('input', () => { fMassNum.value = fMass.value; render(); });
fMassNum.addEventListener('input', () => {
  const v = Math.min(1000, Math.max(0.1, Number(fMassNum.value) || 0.1));
  fMass.value = v; render();
});
fSearch.addEventListener('input', render);
fType.addEventListener('change', render);

$('#reset').addEventListener('click', () => {
  if (!confirm('Сбросить все аномалии к демо-данным? Текущие записи будут удалены.')) return;
  anomalies = resetAnomalies();
  edit = null;
  render();
  toast('Восстановлены демо-данные');
});

render();
