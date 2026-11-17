import csv
import io
from datetime import datetime
from html import escape

COLUMNS = ["Дата", "Имя", "Счёт", "Время партии, сек"]
MAX_ROWS = 500
MAX_NAME = 30


# --- разбор и проверка ---
def parse_records(text):
    lines = text.splitlines()
    if not lines or not lines[0].strip():
        return [], ["файл пустой"]

    delimiter = ";" if ";" in lines[0] else ","
    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)

    missing = [name for name in COLUMNS if name not in reader.fieldnames]
    if missing:
        return [], ["нет колонок: " + ", ".join(missing)]

    records, errors = [], []
    for number, row in enumerate(reader, start=2):
        if len(records) >= MAX_ROWS:
            errors.append(f"взяты только первые {MAX_ROWS} строк")
            break

        date = (row["Дата"] or "").strip()
        name = (row["Имя"] or "").strip()
        score = (row["Счёт"] or "").strip()
        raw_time = (row["Время партии, сек"] or "").strip()

        try:
            datetime.strptime(date, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            errors.append(f"строка {number}: дата «{date}» не вида ГГГГ-ММ-ДД ЧЧ:ММ:СС")
            continue

        if not name or len(name) > MAX_NAME:
            errors.append(f"строка {number}: пустое или слишком длинное имя")
            continue

        try:
            duration = float(raw_time.replace(",", "."))
        except ValueError:
            errors.append(f"строка {number}: время «{raw_time}» не число")
            continue
        if not 0 < duration < 24 * 3600:
            errors.append(f"строка {number}: время {duration} вне границ")
            continue

        left, _, right = score.partition(":")
        if not (left.isdigit() and right.isdigit() and int(left) <= 99 and int(right) <= 99):
            errors.append(f"строка {number}: счёт «{score}» не вида 5:3")
            continue

        records.append({"date": date, "name": name, "score": score, "duration": duration})

    return records, errors


# --- лидеры и статистика ---
def format_top(records, limit=5):
    if not records:
        return "Записей пока нет."

    best = sorted(records, key=lambda r: (r["duration"], r["date"]))[:limit]
    lines = ["#  Имя               Счёт   Время"]
    for place, row in enumerate(best, start=1):
        lines.append(f"{place:<2} {row['name'][:16]:<16}  {row['score']:<5}  {row['duration']:.1f} с")
    return "<pre>" + escape("\n".join(lines)) + "</pre>"


def format_stats(runs):
    if not runs:
        return "Запусков пока нет. Нажми «🌀 Новая симуляция»."

    count = {"orbit": 0, "fell": 0, "escaped": 0}
    for run in runs:
        if run["verdict"] in count:
            count[run["verdict"]] += 1

    best = max(runs, key=lambda run: run["angle"])
    return "\n".join([
        f"Всего запусков: {len(runs)}",
        f"Сделал оборот: {count['orbit']}",
        f"Упал в дыру: {count['fell']}",
        f"Улетел: {count['escaped']}",
        "",
        f"Лучший угол: {best['angle']:.0f}° (масса {best['mass']:g}, vx={best['vx']:g}, vy={best['vy']:g})",
    ])
