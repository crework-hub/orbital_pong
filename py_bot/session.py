import copy
import json

from config import SESSIONS_DIR

DEFAULT_SESSION = {
    "screen_message_id": None,
    "screen_chat_id": None,
    "mass": None,
    "subscribed": False,
    "runs": [],
}

MAX_RUNS = 50


def session_path(user_id):
    return SESSIONS_DIR / f"{user_id}.json"


# --- чтение и запись ---
def load_session(user_id):
    data = copy.deepcopy(DEFAULT_SESSION)
    try:
        with open(session_path(user_id), "r", encoding="utf-8") as file:
            saved = json.load(file)
    except (OSError, ValueError):
        return data

    if isinstance(saved, dict):
        data.update(saved)
    return data


def save_session(user_id, data):
    with open(session_path(user_id), "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)


def add_run(data, run):
    data["runs"].append(run)
    data["runs"] = data["runs"][-MAX_RUNS:]


def subscribers():
    result = []
    for path in SESSIONS_DIR.glob("*.json"):
        try:
            with open(path, "r", encoding="utf-8") as file:
                data = json.load(file)
            if data.get("subscribed"):
                result.append(int(path.stem))
        except (OSError, ValueError, AttributeError):
            continue
    return result
