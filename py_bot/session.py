"""JSON-сессии: состояние пользователя лежит в файле sessions/<user_id>.json.

Так работает stateless-подход: бот не держит ничего в глобальных переменных,
всё, что нужно помнить про пользователя, лежит в его файле.
"""

import json

from config import SESSIONS_DIR

DEFAULT_SESSION = {
    "state": "MENU",
    "screen_message_id": None,
    "screen_chat_id": None,
    "mass": None,
    "subscribed": False,
}


def _path(user_id: int):
    return SESSIONS_DIR / f"{user_id}.json"


def load_session(user_id: int) -> dict:
    """Читает сессию с диска. Нет файла или он битый — возвращает новую."""
    path = _path(user_id)
    if not path.exists():
        return dict(DEFAULT_SESSION)

    try:
        with open(path, "r", encoding="utf-8") as file:
            data = json.load(file)
    except (OSError, json.JSONDecodeError):
        return dict(DEFAULT_SESSION)

    # Недостающие поля добираем из шаблона: старая сессия не сломает бота.
    result = dict(DEFAULT_SESSION)
    result.update(data)
    return result


def save_session(user_id: int, data: dict) -> None:
    """Сохраняет сессию после каждого действия."""
    with open(_path(user_id), "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)


def subscribers() -> list:
    """Все, кто подписался на уведомления. Нужно для рассылки."""
    result = []
    for path in SESSIONS_DIR.glob("*.json"):
        try:
            with open(path, "r", encoding="utf-8") as file:
                data = json.load(file)
        except (OSError, json.JSONDecodeError):
            continue
        if data.get("subscribed"):
            try:
                result.append(int(path.stem))
            except ValueError:
                continue
    return result
