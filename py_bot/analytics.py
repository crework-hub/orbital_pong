"""Разбор выгрузки игры (CSV с рекордами) и построение таблицы лидеров.

Формат records.csv из игры: Дата,Имя,Счёт,"Время партии, сек".
"""

import csv
import io

COLUMNS = ["Дата", "Имя", "Счёт", "Время партии, сек"]
MAX_ROWS = 500


def parse_records_text(text: str):
    """Парсит CSV с рекордами и проверяет каждую строку.

    Возвращает (records, errors): годные записи и список сообщений об ошибках.
    Битые строки не ломают разбор — они просто пропускаются.
    """
    records, errors = [], []

    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        return [], ["файл пустой"]

    missing = [name for name in COLUMNS if name not in reader.fieldnames]
    if missing:
        return [], [f"нет колонок: {', '.join(missing)}"]

    for number, row in enumerate(reader, start=2):
        if len(records) >= MAX_ROWS:
            errors.append(f"взяты только первые {MAX_ROWS} строк")
            break

        name = (row.get("Имя") or "").strip()
        score = (row.get("Счёт") or "").strip()
        raw_time = (row.get("Время партии, сек") or "").strip()

        if not name or len(name) > 30:
            errors.append(f"строка {number}: пустое или слишком длинное имя")
            continue

        try:
            duration = float(raw_time.replace(",", "."))
        except ValueError:
            errors.append(f"строка {number}: время '{raw_time}' не число")
            continue

        if not 0 < duration < 24 * 3600:
            errors.append(f"строка {number}: время {duration} вне разумных границ")
            continue

        left, _, right = score.partition(":")
        if not (left.isdigit() and right.isdigit()):
            errors.append(f"строка {number}: счёт '{score}' не вида '5:3'")
            continue

        records.append({
            "name": name,
            "score": score,
            "duration": duration,
            "date": (row.get("Дата") or "").strip(),
        })

    return records, errors


def format_top(records, limit: int = 5) -> str:
    """Таблица лидеров: самые быстрые партии сверху."""
    if not records:
        return "Годных записей нет."

    best = sorted(records, key=lambda item: item["duration"])[:limit]
    lines = ["#   Имя                 Счёт    Время"]
    for index, row in enumerate(best, start=1):
        lines.append(
            f"{index:<2}  {row['name'][:18]:<18}  {row['score']:<6}  {row['duration']:.1f} с"
        )
    return "\n".join(lines)
