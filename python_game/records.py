import csv
from datetime import datetime
from pathlib import Path

from game_log import logger

ROOT = Path(__file__).resolve().parent.parent
RECORDS_PATH = ROOT / "records.csv"

FIELDS = ["Дата", "Имя", "Счёт", "Время партии, сек"]


def save_record(name, score_text, duration_sec, path=RECORDS_PATH):
    # Дописывает результат партии в CSV. При первом запуске (файла нет или он пустой)
    # сначала пишет строку с заголовками. Возвращает True, если запись удалась.
    first_run = not path.exists() or path.stat().st_size == 0

    try:
        # Режим "a" дописывает в конец и не стирает старые результаты.
        # newline="" нужен модулю csv, иначе в Windows появятся пустые строки.
        with open(path, "a", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)
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


def load_top(limit=5, path=RECORDS_PATH):
    # Возвращает limit самых быстрых побед: список словарей. Нет файла - пустой список.
    rows = []

    try:
        with open(path, "r", newline="", encoding="utf-8") as file:
            for row in csv.DictReader(file):
                try:
                    row["_time"] = float(row[FIELDS[3]])
                except (KeyError, TypeError, ValueError):
                    # Строка повреждена: пропускаем её, остальные читаем дальше.
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
