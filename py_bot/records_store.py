"""Общая база рекордов, которую бот собирает из присланных CSV."""

import csv
from datetime import datetime

from config import BASE_DIR

RECORDS_PATH = BASE_DIR / "records.csv"
FIELDS = ["Дата", "Имя", "Счёт", "Время партии, сек"]


def append_records(records) -> int:
    """Дописывает годные записи в общий records.csv. Возвращает сколько добавлено."""
    if not records:
        return 0

    first_run = not RECORDS_PATH.exists() or RECORDS_PATH.stat().st_size == 0

    with open(RECORDS_PATH, "a", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        if first_run:
            writer.writerow(FIELDS)
        for row in records:
            writer.writerow([
                row["date"] or datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                row["name"],
                row["score"],
                row["duration"],
            ])
    return len(records)


def load_all() -> list:
    """Все записи из общей базы."""
    if not RECORDS_PATH.exists():
        return []

    rows = []
    try:
        with open(RECORDS_PATH, "r", newline="", encoding="utf-8") as file:
            for row in csv.DictReader(file):
                try:
                    duration = float(row[FIELDS[3]])
                except (KeyError, TypeError, ValueError):
                    continue        # битую строку просто пропускаем
                rows.append({
                    "name": row[FIELDS[1]],
                    "score": row[FIELDS[2]],
                    "duration": duration,
                    "date": row[FIELDS[0]],
                })
    except (OSError, csv.Error):
        return []
    return rows
