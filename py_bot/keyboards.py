"""Инлайн-клавиатуры бота."""

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup


def main_menu() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🌀 Новая симуляция", callback_data="sim")],
        [InlineKeyboardButton(text="📤 Загрузить records.csv", callback_data="upload")],
        [InlineKeyboardButton(text="🏆 Таблица лидеров", callback_data="top")],
        [InlineKeyboardButton(text="📊 Моя статистика", callback_data="stats")],
        [InlineKeyboardButton(text="ℹ️ Как это работает", callback_data="help")],
    ])


def cancel_menu() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="⬅️ Отмена", callback_data="menu")],
    ])


def subscribe_menu(subscribed: bool) -> InlineKeyboardMarkup:
    label = "🔕 Отписаться от уведомлений" if subscribed else "🔔 Подписаться на уведомления"
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=label, callback_data="subscribe")],
        [InlineKeyboardButton(text="⬅️ В меню", callback_data="menu")],
    ])
