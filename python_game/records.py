import csv
from datetime import datetime
from pathlib import Path

from game_log import logger

ROOT = Path(__file__).resolve().parent.parent
RECORDS_PATH = ROOT / "records.csv"

FIELDS = ["Дата", "Имя", "Счёт", "Время партии, сек"]


# --- запись ---
def save_record(name, score_text, duration_sec, path=RECORDS_PATH):
    first_run = not path.exists() or path.stat().st_size == 0

    try:
        encoding = "utf-8-sig" if first_run else "utf-8"
        with open(path, "a", newline="", encoding=encoding) as file:
            writer = csv.writer(file, delimiter=";")
            if first_run:
                writer.writerow(FIELDS)
            writer.writerow([
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                name,
                score_text,
                round(duration_sec, 1),
            ])
    except OSError as error:
        print(f"Не удалось сохранить рекорд: {error}")
        logger.error("Не удалось записать %s: %s", path.name, error)
        return False

    logger.info("Рекорд сохранён: %s, счёт %s, %.1f с", name, score_text, duration_sec)
    return True


# --- чтение ---
def load_top(limit=5, path=RECORDS_PATH):
    rows = []

    try:
        with open(path, "r", newline="", encoding="utf-8-sig") as file:
            for row in csv.DictReader(file, delimiter=";"):
                try:
                    row["_time"] = float(row[FIELDS[3]])
                except (KeyError, TypeError, ValueError):
                    logger.warning("Пропущена повреждённая строка в %s: %s", path.name, row)
                    continue
                rows.append(row)
    except FileNotFoundError:
        return []
    except (OSError, UnicodeDecodeError, csv.Error) as error:
        print(f"Не удалось прочитать рекорды: {error}")
        logger.error("Не удалось прочитать %s: %s", path.name, error)
        return []

    rows.sort(key=lambda row: row["_time"])
    return rows[:limit]
