"""История симуляций в CSV: без неё нет статистики."""

import csv
from datetime import datetime

from config import HISTORY_PATH

FIELDS = ["Дата", "Пользователь", "Масса", "vx", "vy", "Вердикт", "Угол"]


def save_run(user_id: int, mass: float, vx: float, vy: float,
             verdict: str, angle: float) -> None:
    """Дописывает одну строку в history.csv, при первом запуске — заголовки."""
    first_run = not HISTORY_PATH.exists() or HISTORY_PATH.stat().st_size == 0

    with open(HISTORY_PATH, "a", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        if first_run:
            writer.writerow(FIELDS)
        writer.writerow([
            datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            user_id,
            mass,
            vx,
            vy,
            verdict,
            round(angle, 1),
        ])


def load_runs(user_id: int) -> list:
    """Все запуски конкретного пользователя. Файла нет — пустой список."""
    if not HISTORY_PATH.exists():
        return []

    rows = []
    try:
        with open(HISTORY_PATH, "r", newline="", encoding="utf-8") as file:
            for row in csv.DictReader(file):
                if row.get("Пользователь") == str(user_id):
                    rows.append(row)
    except (OSError, csv.Error):
        return []
    return rows


def format_stats(user_id: int) -> str:
    """Текст статистики для экрана «Моя статистика»."""
    rows = load_runs(user_id)
    if not rows:
        return "Ты ещё не запускал симуляции. Нажми «🌀 Новая симуляция»."

    total = len(rows)
    orbits = sum(1 for row in rows if row["Вердикт"] == "orbit")
    fell = sum(1 for row in rows if row["Вердикт"] == "fell")
    best = max(rows, key=lambda row: float(row["Угол"] or 0))

    lines = [
        f"Всего запусков: {total}",
        f"Сделал оборот: {orbits}",
        f"Упал в дыру: {fell}",
        "",
        "Лучший результат:",
        f"{best['Угол']}° вокруг дыры (масса {best['Масса']}, vx={best['vx']}, vy={best['vy']})",
        "",
        f"Последний запуск: {rows[-1]['Дата']} — {verdict_ru(rows[-1]['Вердикт'])}",
    ]
    return "\n".join(lines)


def verdict_ru(verdict: str) -> str:
    return {
        "orbit": "совершил оборот вокруг дыры",
        "fell": "упал в чёрную дыру",
        "escaped": "улетел из системы",
    }.get(verdict, verdict)
