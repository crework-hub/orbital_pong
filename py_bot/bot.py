import asyncio
import io
import logging
import re
from html import escape

from aiogram import Bot, Dispatcher, F
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.exceptions import TelegramBadRequest
from aiogram.filters import Command, CommandObject, CommandStart, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, FSInputFile, Message

import analytics
import keyboards
import records_store
import session
from config import ADMIN_IDS, BOT_TOKEN, LOG_PATH, MAX_FILE_SIZE, MAX_MASS, MAX_SPEED, MIN_MASS
from gif_maker import make_gif
from simulation import run_simulation, verdict_ru

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[logging.FileHandler(LOG_PATH, encoding="utf-8"), logging.StreamHandler()],
)
log = logging.getLogger("orbital_bot")

dp = Dispatcher()


class Form(StatesGroup):
    menu = State()
    wait_mass = State()
    wait_vector = State()
    wait_file = State()


MAIN_TEXT = (
    "<b>🌀 Orbital Pong — помощник</b>\n\n"
    "Пришли массу чёрной дыры и вектор мяча — посчитаю полёт и пришлю GIF с вердиктом.\n"
    "Ещё можно загрузить <code>records.csv</code> из игры и посмотреть таблицу лидеров."
)

HELP_TEXT = (
    "<b>Как это работает</b>\n\n"
    "<b>Симуляция.</b> Бот спрашивает массу дыры и вектор мяча (vx, vy), считает полёт "
    "по формуле F = G·M / d², рисует GIF через Pillow и пишет вердикт: оборот, падение или вылет.\n\n"
    "<b>Рекорды.</b> Пришли <code>records.csv</code>, который пишет игра. Бот проверит строки "
    "и соберёт рейтинг самых быстрых побед.\n\n"
    "<b>Сессия.</b> Всё про тебя лежит в <code>sessions/&lt;user_id&gt;.json</code>.\n\n"
    "Команды: /start, /menu, /help, /cancel."
)


def parse_numbers(text):
    found = re.findall(r"-?\d+(?:[.,]\d+)?", text)
    return [float(value.replace(",", ".")) for value in found]


# --- один экран вместо потока сообщений ---
async def show_screen(bot, chat_id, user_id, text, keyboard):
    data = session.load_session(user_id)
    message_id = data["screen_message_id"]

    if message_id and data["screen_chat_id"] == chat_id:
        try:
            await bot.edit_message_text(
                text=text, chat_id=chat_id, message_id=message_id, reply_markup=keyboard,
            )
            return
        except TelegramBadRequest as error:
            if "message is not modified" in str(error):
                return
            log.info("Экран %s недоступен, шлю новый: %s", message_id, error)

    message = await bot.send_message(chat_id, text, reply_markup=keyboard)
    data["screen_message_id"] = message.message_id
    data["screen_chat_id"] = chat_id
    session.save_session(user_id, data)


async def show_menu(bot, chat_id, user_id):
    await show_screen(bot, chat_id, user_id, MAIN_TEXT, keyboards.main_menu())


def new_screen(user_id):
    data = session.load_session(user_id)
    data["screen_message_id"] = None
    session.save_session(user_id, data)


async def answer(callback):
    try:
        await callback.answer()
    except TelegramBadRequest:
        pass


# --- команды ---
@dp.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext, bot: Bot):
    log.info("Команда /start: user=%s", message.from_user.id)
    await state.set_state(Form.menu)
    new_screen(message.from_user.id)
    await show_menu(bot, message.chat.id, message.from_user.id)


@dp.message(Command("menu", "cancel"))
async def cmd_menu(message: Message, state: FSMContext, bot: Bot):
    await state.set_state(Form.menu)
    await show_menu(bot, message.chat.id, message.from_user.id)


@dp.message(Command("help"))
async def cmd_help(message: Message, bot: Bot):
    await show_screen(bot, message.chat.id, message.from_user.id, HELP_TEXT, keyboards.main_menu())


# --- кнопки ---
@dp.callback_query(F.data == "menu")
async def cb_menu(callback: CallbackQuery, state: FSMContext, bot: Bot):
    await answer(callback)
    await state.set_state(Form.menu)
    await show_menu(bot, callback.message.chat.id, callback.from_user.id)


@dp.callback_query(F.data == "help")
async def cb_help(callback: CallbackQuery, bot: Bot):
    await answer(callback)
    await show_screen(bot, callback.message.chat.id, callback.from_user.id,
                      HELP_TEXT, keyboards.main_menu())


@dp.callback_query(F.data == "stats")
async def cb_stats(callback: CallbackQuery, bot: Bot):
    await answer(callback)
    runs = session.load_session(callback.from_user.id)["runs"]
    text = "<b>📊 Моя статистика</b>\n\n" + analytics.format_stats(runs)
    await show_screen(bot, callback.message.chat.id, callback.from_user.id,
                      text, keyboards.main_menu())


@dp.callback_query(F.data == "top")
async def cb_top(callback: CallbackQuery, bot: Bot):
    await answer(callback)
    text = "<b>🏆 Таблица лидеров</b>\n\n" + analytics.format_top(records_store.load_all())
    await show_screen(bot, callback.message.chat.id, callback.from_user.id,
                      text, keyboards.main_menu())


@dp.callback_query(F.data == "sim")
async def cb_sim(callback: CallbackQuery, state: FSMContext, bot: Bot):
    await answer(callback)
    await state.set_state(Form.wait_mass)
    text = (
        "<b>Шаг 1 из 2</b>\n\n"
        f"Пришли массу чёрной дыры: число от {MIN_MASS:g} до {MAX_MASS:g}.\n"
        "Например: <code>6</code>"
    )
    await show_screen(bot, callback.message.chat.id, callback.from_user.id,
                      text, keyboards.cancel_menu())


@dp.callback_query(F.data == "upload")
async def cb_upload(callback: CallbackQuery, state: FSMContext, bot: Bot):
    await answer(callback)
    await state.set_state(Form.wait_file)
    text = (
        "<b>📤 Загрузка рекордов</b>\n\n"
        "Пришли файл <code>records.csv</code> из папки игры (.csv, до 1 МБ).\n"
        "Колонки: Дата, Имя, Счёт, Время партии, сек."
    )
    await show_screen(bot, callback.message.chat.id, callback.from_user.id,
                      text, keyboards.cancel_menu())


@dp.callback_query(F.data.in_({"subscribe", "subscribe_toggle"}))
async def cb_subscribe(callback: CallbackQuery, bot: Bot):
    await answer(callback)
    user_id = callback.from_user.id
    data = session.load_session(user_id)

    if callback.data == "subscribe_toggle":
        data["subscribed"] = not data["subscribed"]
        session.save_session(user_id, data)
        log.info("Подписка: user=%s subscribed=%s", user_id, data["subscribed"])

    status = "включены" if data["subscribed"] else "выключены"
    text = f"<b>🔔 Уведомления</b>\n\nУведомления о новых рекордах {status}."
    await show_screen(bot, callback.message.chat.id, user_id,
                      text, keyboards.subscribe_menu(data["subscribed"]))


# --- рассылка и админ ---
async def notify_subscribers(bot, text, skip=None):
    sent = 0
    for user_id in session.subscribers():
        if user_id == skip:
            continue
        try:
            await bot.send_message(user_id, text)
            sent += 1
        except Exception as error:
            log.info("Не доставлено %s: %s", user_id, error)
    log.info("Рассылка: доставлено %s", sent)
    return sent


@dp.message(Command("log"))
async def cmd_log(message: Message):
    if message.from_user.id not in ADMIN_IDS:
        log.warning("Нет прав на /log: user=%s", message.from_user.id)
        await message.answer("Нет прав.")
        return

    try:
        lines = LOG_PATH.read_text(encoding="utf-8").splitlines()[-15:]
    except OSError:
        lines = ["лог пока пуст"]
    await message.answer("<pre>" + escape("\n".join(lines))[-3500:] + "</pre>")


@dp.message(Command("broadcast"))
async def cmd_broadcast(message: Message, command: CommandObject, bot: Bot):
    if message.from_user.id not in ADMIN_IDS:
        log.warning("Нет прав на /broadcast: user=%s", message.from_user.id)
        await message.answer("Нет прав.")
        return
    if not command.args:
        await message.answer("Формат: <code>/broadcast текст</code>")
        return

    sent = await notify_subscribers(bot, "📢 " + command.args)
    await message.answer(f"Доставлено подписчикам: {sent}")


# --- ввод параметров симуляции ---
@dp.message(StateFilter(Form.wait_mass), F.text)
async def enter_mass(message: Message, state: FSMContext, bot: Bot):
    numbers = parse_numbers(message.text)
    if not numbers:
        await message.answer("Нужно число. Например: <code>6</code>")
        return

    mass = numbers[0]
    if not MIN_MASS <= mass <= MAX_MASS:
        await message.answer(f"Масса должна быть от {MIN_MASS:g} до {MAX_MASS:g}.")
        return

    user_id = message.from_user.id
    data = session.load_session(user_id)
    data["mass"] = mass
    session.save_session(user_id, data)

    await state.set_state(Form.wait_vector)
    text = (
        "<b>Шаг 2 из 2</b>\n\n"
        f"Масса дыры: <b>{mass:g}</b>.\n"
        f"Теперь вектор мяча: vx и vy через пробел, каждое от -{MAX_SPEED:g} до {MAX_SPEED:g}.\n"
        "Например: <code>3 1</code>"
    )
    await show_screen(bot, message.chat.id, user_id, text, keyboards.cancel_menu())


@dp.message(StateFilter(Form.wait_vector), F.text)
async def enter_vector(message: Message, state: FSMContext, bot: Bot):
    numbers = parse_numbers(message.text)
    if len(numbers) < 2:
        await message.answer("Нужно два числа: vx и vy. Например: <code>3 1</code>")
        return

    vx, vy = numbers[0], numbers[1]
    if abs(vx) > MAX_SPEED or abs(vy) > MAX_SPEED:
        await message.answer(f"Каждое число — от -{MAX_SPEED:g} до {MAX_SPEED:g}.")
        return
    if abs(vx) < 0.5 and abs(vy) < 0.5:
        await message.answer("Слишком медленный мяч. Дай хотя бы 1.")
        return

    user_id = message.from_user.id
    data = session.load_session(user_id)
    mass = data["mass"] or 1.0

    await message.answer("Считаю траекторию и рисую GIF…")
    log.info("Симуляция: user=%s mass=%s vx=%s vy=%s", user_id, mass, vx, vy)

    result = await asyncio.to_thread(run_simulation, mass, vx, vy)
    path = await asyncio.to_thread(make_gif, result["points"], user_id)

    session.add_run(data, {
        "mass": mass, "vx": vx, "vy": vy,
        "verdict": result["verdict"], "angle": result["angle"],
    })
    session.save_session(user_id, data)

    caption = (
        "<b>Результат</b>\n"
        f"Масса дыры: {mass:g}\n"
        f"Вектор: vx={vx:g}, vy={vy:g}\n"
        f"Время полёта: {result['duration']:.1f} с\n"
        f"Угол вокруг дыры: {result['angle']:.0f}°\n\n"
        f"<b>Вердикт: мяч {verdict_ru(result['verdict'])}</b>"
    )
    await bot.send_animation(message.chat.id, FSInputFile(path), caption=caption)

    await state.set_state(Form.menu)
    new_screen(user_id)
    await show_menu(bot, message.chat.id, user_id)


# --- загрузка файла ---
@dp.message(StateFilter(Form.wait_file), F.document)
async def handle_upload(message: Message, state: FSMContext, bot: Bot):
    user_id = message.from_user.id
    document = message.document

    if not (document.file_name or "").lower().endswith(".csv"):
        await message.answer("Нужен файл с расширением .csv")
        return
    if document.file_size and document.file_size > MAX_FILE_SIZE:
        await message.answer("Файл слишком большой, максимум 1 МБ.")
        return

    buffer = io.BytesIO()
    try:
        await bot.download(document, destination=buffer)
        text = buffer.getvalue().decode("utf-8-sig")
    except UnicodeDecodeError:
        log.warning("Загрузка: user=%s файл не в UTF-8", user_id)
        await message.answer("Файл не в кодировке UTF-8. Пришли records.csv из игры.")
        return
    except Exception as error:
        log.error("Загрузка: не удалось скачать файл: %s", error)
        await message.answer("Не получилось скачать файл. Попробуй ещё раз.")
        return

    records, errors = analytics.parse_records(text)
    added = records_store.add_records(records)
    log.info("Загрузка: user=%s годных=%s добавлено=%s ошибок=%s",
             user_id, len(records), added, len(errors))

    report = ["<b>📤 Файл разобран</b>", f"Добавлено записей: <b>{added}</b>"]
    if len(records) > added:
        report.append(f"Уже были в базе: {len(records) - added}")
    if errors:
        report.append(f"Отклонено строк: {len(errors)}")
        report.extend("• " + escape(error) for error in errors[:5])

    await state.set_state(Form.menu)
    await show_screen(bot, message.chat.id, user_id, "\n".join(report), keyboards.main_menu())

    if added:
        await notify_subscribers(bot, f"🔔 В рейтинг добавлено записей: {added}", skip=user_id)


@dp.message(StateFilter(Form.wait_file))
async def wait_file_text(message: Message):
    await message.answer("Жду файл .csv. Или нажми «Отмена» на экране.")


# --- остальное ---
@dp.message()
async def fallback(message: Message):
    await message.answer("Не понял. Нажми /start, чтобы открыть меню.")


@dp.errors()
async def on_error(event):
    log.error("Ошибка обработчика: %s", event.exception, exc_info=True)
    return True


async def main():
    if not BOT_TOKEN:
        print("Нет токена. Создай py_bot/.env со строкой BOT_TOKEN=токен_от_BotFather")
        return

    bot = Bot(BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    log.info("Бот запущен")
    await dp.start_polling(bot)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log.info("Бот остановлен")
