"""Telegram-бот «Орбитальная симуляция» для игры Orbital Pong (вариант 15).

Что умеет:
  • принимает массу чёрной дыры и начальный вектор мяча;
  • считает полёт по формуле F = G·M / d² и присылает GIF с вердиктом;
  • принимает выгрузку records.csv из игры, проверяет строки и строит таблицу лидеров;
  • хранит сессию каждого пользователя в JSON-файле (stateless-архитектура);
  • умеет подписку на уведомления о новых рекордах.
"""

import asyncio
import io
import logging
import re

from aiogram import Bot, Dispatcher, F
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.exceptions import TelegramBadRequest
from aiogram.filters import Command, CommandStart, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, FSInputFile, Message

import analytics
import history
import keyboards
import records_store
import session
from config import BOT_TOKEN, LOG_PATH, MAX_MASS, MAX_SPEED, MIN_MASS
from gif_maker import gif_path, make_gif
from simulation import run_simulation

# ---------- Логирование в файл ----------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.FileHandler(LOG_PATH, mode="a", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger("orbital_bot")


class Form(StatesGroup):
    """Состояния бота: что он сейчас ждёт от пользователя."""
    menu = State()
    wait_mass = State()
    wait_vector = State()
    wait_file = State()


bot = Bot(BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
dp = Dispatcher()

MAIN_TEXT = (
    "<b>🌀 Orbital Pong — симулятор гравитации</b>\n\n"
    "Чёрная дыра в центре поля искривляет полёт мяча: F = G·M / d².\n"
    "Пришли массу дыры и начальный вектор мяча — посчитаю траекторию и покажу её в GIF.\n\n"
    "Ещё можно загрузить <code>records.csv</code> из игры и посмотреть таблицу лидеров."
)


# ---------- Один экран вместо потока сообщений ----------
async def show_screen(chat_id: int, user_id: int, text: str, keyboard) -> None:
    """Правит сообщение-экран пользователя; если нельзя — отправляет новое."""
    data = session.load_session(user_id)
    message_id = data.get("screen_message_id")

    if message_id and data.get("screen_chat_id") == chat_id:
        try:
            await bot.edit_message_text(
                text=text, chat_id=chat_id, message_id=message_id, reply_markup=keyboard,
            )
            return
        except TelegramBadRequest as error:
            if "message is not modified" in str(error):
                return      # текст не изменился — это норма, не ошибка
            log.info("Экран %s недоступен: %s", message_id, error)

    message = await bot.send_message(chat_id, text, reply_markup=keyboard)
    data["screen_message_id"] = message.message_id
    data["screen_chat_id"] = chat_id
    session.save_session(user_id, data)


async def show_menu(chat_id: int, user_id: int) -> None:
    await show_screen(chat_id, user_id, MAIN_TEXT, keyboards.main_menu())


def parse_numbers(text: str) -> list:
    """Достаёт числа из строки: «2.5, -3» → [2.5, -3.0]. Мусор отбрасывает."""
    found = re.findall(r"-?\d+(?:[.,]\d+)?", text)
    return [float(value.replace(",", ".")) for value in found]


# ---------- Команды ----------
@dp.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext) -> None:
    await state.set_state(Form.menu)
    data = session.load_session(message.from_user.id)
    data["screen_message_id"] = None      # новое сообщение — новый экран
    session.save_session(message.from_user.id, data)
    log.info("Старт: user=%s", message.from_user.id)
    await show_menu(message.chat.id, message.from_user.id)


@dp.message(Command("menu"))
async def cmd_menu(message: Message, state: FSMContext) -> None:
    await state.set_state(Form.menu)
    await show_menu(message.chat.id, message.from_user.id)


@dp.message(Command("cancel"))
async def cmd_cancel(message: Message, state: FSMContext) -> None:
    await state.set_state(Form.menu)
    await show_menu(message.chat.id, message.from_user.id)


# ---------- Кнопки ----------
@dp.callback_query(F.data == "menu")
async def cb_menu(callback: CallbackQuery, state: FSMContext) -> None:
    await callback.answer()
    await state.set_state(Form.menu)
    await show_menu(callback.message.chat.id, callback.from_user.id)


@dp.callback_query(F.data == "help")
async def cb_help(callback: CallbackQuery) -> None:
    await callback.answer()
    text = (
        "<b>Как это работает</b>\n\n"
        "<b>Симуляция.</b> Бот спрашивает массу чёрной дыры и вектор мяча (vx, vy), "
        "считает полёт по формуле F = G·M / d² кадр за кадром, как в самой игре, "
        "рисует GIF через Pillow и говорит вердикт: мяч сделал оборот, упал в дыру "
        "или улетел.\n\n"
        "<b>Таблица лидеров.</b> Пришли файл <code>records.csv</code>, который игра "
        "пишет после партии. Бот проверит каждую строку (имя, счёт вида 5:3, время "
        "числом) и соберёт общий рейтинг самых быстрых побед.\n\n"
        "<b>Сессия.</b> Всё, что бот про тебя помнит, лежит в файле "
        "<code>sessions/&lt;user_id&gt;.json</code>.\n\n"
        "Команды: /start — меню, /menu, /cancel — отмена, /help — эта справка."
    )
    await show_screen(callback.message.chat.id, callback.from_user.id, text,
                      keyboards.main_menu())


@dp.callback_query(F.data == "stats")
async def cb_stats(callback: CallbackQuery) -> None:
    await callback.answer()
    text = "<b>📊 Твоя статистика</b>\n\n" + history.format_stats(callback.from_user.id)
    await show_screen(callback.message.chat.id, callback.from_user.id, text,
                      keyboards.main_menu())


@dp.callback_query(F.data == "sim")
async def cb_sim(callback: CallbackQuery, state: FSMContext) -> None:
    await callback.answer()
    await state.set_state(Form.wait_mass)
    text = (
        "<b>Шаг 1 из 2</b>\n\n"
        f"Пришли массу чёрной дыры числом от {MIN_MASS} до {MAX_MASS:.0f}.\n"
        "Например: <code>6</code>"
    )
    await show_screen(callback.message.chat.id, callback.from_user.id, text,
                      keyboards.cancel_menu())


@dp.callback_query(F.data == "upload")
async def cb_upload(callback: CallbackQuery, state: FSMContext) -> None:
    await callback.answer()
    await state.set_state(Form.wait_file)
    text = (
        "<b>📤 Загрузка рекордов</b>\n\n"
        "Пришли файл <code>records.csv</code> из папки игры.\n"
        "Колонки: Дата, Имя, Счёт, Время партии, сек."
    )
    await show_screen(callback.message.chat.id, callback.from_user.id, text,
                      keyboards.cancel_menu())


@dp.callback_query(F.data == "top")
async def cb_top(callback: CallbackQuery) -> None:
    await callback.answer()
    rows = records_store.load_all()
    text = "<b>🏆 Таблица лидеров</b>\n\n" + analytics.format_top(rows)
    if not rows:
        text += "\n\nЗагрузи records.csv кнопкой «📤 Загрузить records.csv»."
    await show_screen(callback.message.chat.id, callback.from_user.id, text,
                      keyboards.main_menu())


@dp.callback_query(F.data == "subscribe")
async def cb_subscribe(callback: CallbackQuery) -> None:
    await callback.answer()
    data = session.load_session(callback.from_user.id)
    data["subscribed"] = not data.get("subscribed", False)
    session.save_session(callback.from_user.id, data)

    state_text = "включены" if data["subscribed"] else "выключены"
    text = f"<b>🔔 Уведомления</b>\n\nУведомления о новых рекордах {state_text}."
    await show_screen(callback.message.chat.id, callback.from_user.id, text,
                      keyboards.subscribe_menu(data["subscribed"]))


# ---------- Ввод параметров симуляции ----------
@dp.message(StateFilter(Form.wait_mass))
async def enter_mass(message: Message, state: FSMContext) -> None:
    numbers = parse_numbers(message.text or "")
    if not numbers:
        await message.answer("Нужно число. Например: <code>6</code>")
        return

    mass = numbers[0]
    if not MIN_MASS <= mass <= MAX_MASS:
        await message.answer(
            f"Масса должна быть от {MIN_MASS} до {MAX_MASS:.0f}. Попробуй ещё раз."
        )
        return

    data = session.load_session(message.from_user.id)
    data["mass"] = mass
    session.save_session(message.from_user.id, data)

    await state.set_state(Form.wait_vector)
    await show_screen(
        message.chat.id, message.from_user.id,
        "<b>Шаг 2 из 2</b>\n\n"
        f"Масса принята: <b>{mass}</b>.\n"
        f"Теперь вектор мяча: два числа от -{MAX_SPEED:.0f} до {MAX_SPEED:.0f} "
        "через пробел — vx и vy.\n"
        "Например: <code>3 1</code>",
        keyboards.cancel_menu(),
    )


@dp.message(StateFilter(Form.wait_vector))
async def enter_vector(message: Message, state: FSMContext) -> None:
    numbers = parse_numbers(message.text or "")
    if len(numbers) < 2:
        await message.answer("Нужно два числа: vx и vy. Например: <code>3 1</code>")
        return

    vx, vy = numbers[0], numbers[1]
    if abs(vx) > MAX_SPEED or abs(vy) > MAX_SPEED:
        await message.answer(
            f"Каждое число — от -{MAX_SPEED:.0f} до {MAX_SPEED:.0f}. Попробуй ещё раз."
        )
        return
    if abs(vx) < 0.5 and abs(vy) < 0.5:
        await message.answer("Слишком медленный мяч — он сразу упадёт. Дай хотя бы 1.")
        return

    user_id = message.from_user.id
    data = session.load_session(user_id)
    mass = data.get("mass") or 1.0

    await message.answer("Считаю траекторию и рисую GIF…")
    log.info("Симуляция: user=%s mass=%s vx=%s vy=%s", user_id, mass, vx, vy)

    result = run_simulation(mass, vx, vy)
    number = len(history.load_runs(user_id)) + 1
    path = make_gif(result["points"], gif_path(user_id, number))
    history.save_run(user_id, mass, vx, vy, result["verdict"], result["angle"])

    caption = (
        "<b>Результат</b>\n"
        f"Масса дыры: {mass}\n"
        f"Вектор: vx={vx}, vy={vy}\n"
        f"Время полёта: {result['duration']:.1f} с\n"
        f"Угол вокруг дыры: {result['angle']:.0f}°\n\n"
        f"<b>Вердикт: {history.verdict_ru(result['verdict'])}</b>"
    )
    await bot.send_animation(message.chat.id, FSInputFile(path), caption=caption)

    await state.set_state(Form.menu)
    await show_menu(message.chat.id, user_id)


# ---------- Загрузка CSV с рекордами ----------
@dp.message(StateFilter(Form.wait_file), F.document)
async def handle_upload(message: Message, state: FSMContext) -> None:
    user_id = message.from_user.id
    document = message.document

    if document.file_size and document.file_size > 1_000_000:
        await message.answer("Файл слишком большой — максимум 1 МБ.")
        return

    buffer = io.BytesIO()
    try:
        await bot.download(document, destination=buffer)
        text = buffer.getvalue().decode("utf-8-sig")
    except Exception as error:                     # noqa: BLE001 — бот не должен падать
        log.error("Не удалось скачать файл: %s", error)
        await message.answer("Не получилось прочитать файл. Пришли обычный CSV.")
        return

    records, errors = analytics.parse_records_text(text)
    added = records_store.append_records(records)
    log.info("Загрузка: user=%s добавлено=%s ошибок=%s", user_id, added, len(errors))

    report = [f"<b>📤 Файл разобран</b>", f"Добавлено записей: <b>{added}</b>"]
    if errors:
        report.append(f"Отклонено строк: {len(errors)}")
        report.extend(f"• {error}" for error in errors[:5])
        if len(errors) > 5:
            report.append(f"…и ещё {len(errors) - 5}")

    await show_screen(message.chat.id, user_id, "\n".join(report), keyboards.main_menu())

    # Уведомление подписчикам о новых результатах.
    if added:
        await notify_subscribers(user_id, added)

    await state.set_state(Form.menu)


async def notify_subscribers(author_id: int, added: int) -> None:
    """Рассылка подписчикам: пришли новые рекорды."""
    for user_id in session.subscribers():
        if user_id == author_id:
            continue
        try:
            await bot.send_message(user_id, f"🔔 В общий рейтинг добавлено записей: {added}")
        except Exception as error:                 # noqa: BLE001
            log.info("Не доставили уведомление %s: %s", user_id, error)


# ---------- Всё остальное ----------
@dp.message()
async def fallback(message: Message) -> None:
    await message.answer("Не понял. Нажми /start, чтобы открыть меню.")


@dp.errors()
async def on_error(event) -> bool:
    """Последняя линия защиты: ошибка обработчика не роняет бота."""
    log.error("Ошибка апдейта: %s", event.exception, exc_info=True)
    return True


async def main() -> None:
    if not BOT_TOKEN:
        raise SystemExit(
            "Нет токена. Создай файл py_bot/.env со строкой:\n"
            "BOT_TOKEN=токен_от_BotFather"
        )
    log.info("Бот запущен")
    await dp.start_polling(bot)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        log.info("Бот остановлен")
