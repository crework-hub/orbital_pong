import csv

from analytics import COLUMNS
from config import LEADERBOARD_PATH


def load_all():
    rows = []
    try:
        with open(LEADERBOARD_PATH, "r", newline="", encoding="utf-8-sig") as file:
            for row in csv.DictReader(file, delimiter=";"):
                try:
                    rows.append({
                        "date": row[COLUMNS[0]],
                        "name": row[COLUMNS[1]],
                        "score": row[COLUMNS[2]],
                        "duration": float(row[COLUMNS[3]]),
                    })
                except (KeyError, TypeError, ValueError):
                    continue
    except (OSError, UnicodeDecodeError, csv.Error):
        return []
    return rows


# --- добавление ---
def add_records(records):
    known = {(r["date"], r["name"], r["score"], r["duration"]) for r in load_all()}
    new = [r for r in records if (r["date"], r["name"], r["score"], r["duration"]) not in known]
    if not new:
        return 0

    first_run = not LEADERBOARD_PATH.exists() or LEADERBOARD_PATH.stat().st_size == 0
    encoding = "utf-8-sig" if first_run else "utf-8"
    with open(LEADERBOARD_PATH, "a", newline="", encoding=encoding) as file:
        writer = csv.writer(file, delimiter=";")
        if first_run:
            writer.writerow(COLUMNS)
        for r in new:
            writer.writerow([r["date"], r["name"], r["score"], r["duration"]])
    return len(new)
