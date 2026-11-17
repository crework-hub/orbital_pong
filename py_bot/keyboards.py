from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup


def make(*rows):
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=text, callback_data=data)] for text, data in rows
    ])


def main_menu():
    return make(
        ("🌀 Новая симуляция", "sim"),
        ("📤 Загрузить records.csv", "upload"),
        ("🏆 Таблица лидеров", "top"),
        ("📊 Моя статистика", "stats"),
        ("🔔 Уведомления", "subscribe"),
        ("ℹ️ Как это работает", "help"),
    )


def cancel_menu():
    return make(("⬅️ Отмена", "menu"))


def subscribe_menu(subscribed):
    label = "🔕 Отписаться" if subscribed else "🔔 Подписаться"
    return make((label, "subscribe_toggle"), ("⬅️ В меню", "menu"))
