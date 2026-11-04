/**
 * Вся отрисовка виджета на Canvas.
 *
 * Модуль знает только про ctx и про объекты игры: никакой физики и ввода здесь нет.
 * Отрисовка разбита на слои, чтобы порядок наложения читался сверху вниз:
 *
 *   фон → рамка поля → кольца → дыра → аномалии → эффекты →
 *   ракетки → след мяча → ТУМАН ВИДИМОСТИ → мяч со свечением и индикаторы
 *
 * Всё, что должно «пробивать» туман (мяч, маркер, подписи), рисуется после маски.
 */

import { CONFIG, MAX_FORCE } from '../../js_core/js/config.js';
import { gravityForce } from '../../js_core/js/physics.js';

/** Радиус видимости по умолчанию, px. */
export const DEFAULT_VIEW_RADIUS = 420;

/** Сколько точек следа мяча помним. */
export const TRAIL_LENGTH = 15;

/** Радиусы колец: от 20 до ~300 px, восемь штук, шаг геометрический. */
export const RING_RADII = Object.freeze(
    Array.from({ length: 8 }, (_, i) => 20 * Math.pow(300 / 20, i / 7)),
);

/* ------------------------------------------------------------------ */
/* Фон                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Звёзды генерируются один раз при старте, а не каждый кадр —
 * иначе небо мерцало бы и дёргалось.
 * @returns {Array<{x:number,y:number,r:number,alpha:number}>}
 */
export function makeStars(count = 120) {
    const stars = [];
    for (let i = 0; i < count; i += 1) {
        stars.push({
            x: Math.random() * CONFIG.WIDTH,
            y: Math.random() * CONFIG.HEIGHT,
            r: 0.4 + Math.random() * 1.4,
            alpha: 0.18 + Math.random() * 0.55,
        });
    }
    return stars;
}

export function drawBackground(ctx, stars, time = 0) {
    const sky = ctx.createLinearGradient(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    sky.addColorStop(0, '#05070f');
    sky.addColorStop(0.55, '#070a18');
    sky.addColorStop(1, '#04030a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    // Дальняя туманность — два мягких пятна, чтобы фон не был плоским.
    const nebula = ctx.createRadialGradient(620, 120, 10, 620, 120, 460);
    nebula.addColorStop(0, 'rgba(70, 40, 140, 0.20)');
    nebula.addColorStop(1, 'rgba(70, 40, 140, 0)');
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    for (const star of stars) {
        // Медленное дыхание звёзд: множитель 0.85…1.0, без резких скачков.
        const twinkle = 0.85 + 0.15 * Math.sin(time / 900 + star.x);
        ctx.globalAlpha = star.alpha * twinkle;
        ctx.fillStyle = '#dfe9ff';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

export function drawField(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(120, 200, 255, 0.28)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, CONFIG.WIDTH - 2, CONFIG.HEIGHT - 2);

    // Центральная линия и пунктир — просто чтобы поле читалось как корт.
    ctx.setLineDash([6, 10]);
    ctx.strokeStyle = 'rgba(120, 200, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CONFIG.WIDTH / 2, 0);
    ctx.lineTo(CONFIG.WIDTH / 2, CONFIG.HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Чёрная дыра и кольца варианта 15                                    */
/* ------------------------------------------------------------------ */

/**
 * Сырая прозрачность кольца на радиусе r — строго по формуле варианта:
 *
 *     alpha = min(1, gravityForce(mass, r) / MAX_FORCE(mass))
 *
 * MAX_FORCE — это предел силы при d → 0, поэтому отношение всегда в (0, 1]:
 * чем ближе кольцо к дыре, тем больше сила и тем ярче кольцо.
 */
export function ringAlpha(mass, r) {
    const max = MAX_FORCE(mass);
    if (max <= 0) return 0;
    return Math.min(1, gravityForce(mass, r) / max);
}

/**
 * Прозрачность для экрана: та же величина, но с гамма-коррекцией.
 *
 * Сила падает как 1/r², поэтому при массе 10 сырая alpha на r = 300
 * равна 0.0004 — кольцо физически корректное, но глазом не видно.
 * Гамма 0.30 сжимает диапазон, сохраняя порядок «ближе — ярче»:
 * в README есть таблица сырых и отображаемых значений.
 */
export function ringDisplayAlpha(mass, r) {
    const raw = ringAlpha(mass, r);
    return 0.10 + 0.92 * Math.pow(raw, 0.30);
}

/**
 * Концентрические орбитальные кольца вокруг чёрной дыры.
 * Это и есть сценарий «визуализация искривления пространства» варианта 15.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x:number,y:number}} hole
 * @param {number} mass масса дыры
 * @param {{time?:number, enabled?:boolean}} options
 */
export function drawOrbitRings(ctx, hole, mass, options = {}) {
    const { time = 0, enabled = true } = options;
    if (!enabled) return;

    ctx.save();
    ctx.translate(hole.x, hole.y);

    for (let i = 0; i < RING_RADII.length; i += 1) {
        const radius = RING_RADII[i];
        const energy = ringAlpha(mass, radius);
        const alpha = ringDisplayAlpha(mass, radius);

        // Кольца медленно вращаются: у каждого своя фаза и скорость.
        const phase = time / (2600 + i * 700) + i * 0.8;
        const tilt = Math.sin(phase) * 0.12 + 0.18;   // лёгкий наклон орбиты

        ctx.save();
        ctx.rotate(phase * 0.35);
        ctx.scale(1, 1 - tilt * 0.55);                // эллипс — «орбита», а не круг

        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);

        // Цвет теплее у горизонта событий, холоднее — на периферии.
        const hue = 190 + 120 * energy;
        ctx.strokeStyle = `hsla(${hue}, 95%, 72%, ${alpha})`;
        ctx.lineWidth = 1 + 2.4 * energy;
        if (energy > 0.2) {
            ctx.shadowColor = `hsla(${hue}, 95%, 70%, ${alpha * 0.9})`;
            ctx.shadowBlur = 10 * energy;
        }
        ctx.stroke();
        ctx.restore();
    }

    ctx.restore();
}

export function drawHole(ctx, hole, mass, time) {
    const pulse = 0.5 + 0.5 * Math.sin(time / 420);
    const rim = 20 + pulse * 4;

    ctx.save();

    // Аккреционный диск: мягкое свечение вокруг горизонта событий.
    const glow = ctx.createRadialGradient(hole.x, hole.y, 4, hole.x, hole.y, rim * 3.4);
    glow.addColorStop(0, 'rgba(255, 176, 64, 0.55)');
    glow.addColorStop(0.45, 'rgba(180, 90, 255, 0.22)');
    glow.addColorStop(1, 'rgba(60, 20, 120, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, rim * 3.4, 0, Math.PI * 2);
    ctx.fill();

    // Сам горизонт событий — абсолютно чёрный диск.
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, rim, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(255, 196, 96, ${0.45 + 0.35 * pulse})`;
    ctx.stroke();

    // Подпись массы прямо у дыры.
    ctx.font = '11px "Courier New", monospace';
    ctx.fillStyle = 'rgba(255, 205, 120, 0.75)';
    ctx.textAlign = 'center';
    ctx.fillText(`M = ${mass}`, hole.x, hole.y + rim + 16);

    ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Сущности                                                            */
/* ------------------------------------------------------------------ */

export function drawAnomalies(ctx, anomalies, time) {
    for (const anomaly of anomalies) {
        const pulse = 0.5 + 0.5 * Math.sin(time / 500 + anomaly.phase);
        ctx.save();
        ctx.beginPath();
        ctx.arc(anomaly.x, anomaly.y, anomaly.radius * (1 + pulse * 0.08), 0, Math.PI * 2);
        ctx.fillStyle = anomaly.type === 'white' ? 'rgba(240, 250, 255, 0.85)' : '#000000';
        ctx.shadowColor = anomaly.type === 'white' ? 'rgba(200, 240, 255, 0.9)' : 'rgba(190, 120, 255, 0.9)';
        ctx.shadowBlur = 22;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = anomaly.type === 'white' ? 'rgba(160, 220, 255, 0.8)' : 'rgba(200, 130, 255, 0.8)';
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.font = '10px "Courier New", monospace';
        ctx.fillStyle = 'rgba(220, 220, 255, 0.8)';
        ctx.textAlign = 'center';
        ctx.fillText(`аномалия ${anomaly.mass}`, anomaly.x, anomaly.y + anomaly.radius + 14);
        ctx.restore();
    }
}

function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function drawPaddle(ctx, x, y, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    roundRect(ctx, x, y, CONFIG.PADDLE_WIDTH, CONFIG.PADDLE_HEIGHT, 8);
    const fill = ctx.createLinearGradient(x, y, x + CONFIG.PADDLE_WIDTH, y + CONFIG.PADDLE_HEIGHT);
    fill.addColorStop(0, color);
    fill.addColorStop(0.5, '#ffffff');
    fill.addColorStop(1, color);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
}

export const PADDLE_COLORS = Object.freeze({ left: '#4fc3ff', right: '#ff5fa8' });

export function drawPaddles(ctx, view, game, alphaRight = 1) {
    drawPaddle(ctx, game.left.x, view.leftY, PADDLE_COLORS.left, 1);
    drawPaddle(ctx, game.right.x, view.rightY, PADDLE_COLORS.right, alphaRight);
}

/** След мяча: массив последних позиций с падающей прозрачностью. */
export function pushTrail(trail, x, y) {
    trail.push({ x, y });
    while (trail.length > TRAIL_LENGTH) trail.shift();
}

export function drawTrail(ctx, trail) {
    for (let i = 0; i < trail.length; i += 1) {
        const point = trail[i];
        const t = i / trail.length;            // 0 — самый старый
        ctx.beginPath();
        ctx.arc(point.x, point.y, CONFIG.BALL_RADIUS * (0.25 + t * 0.7), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(150, 235, 255, ${0.03 + t * 0.28})`;
        ctx.fill();
    }
}

export function drawBall(ctx, x, y, time) {
    ctx.save();

    // Ореол, который пробивает туман видимости.
    const halo = ctx.createRadialGradient(x, y, 2, x, y, 46);
    halo.addColorStop(0, 'rgba(200, 245, 255, 0.55)');
    halo.addColorStop(0.35, 'rgba(120, 210, 255, 0.18)');
    halo.addColorStop(1, 'rgba(80, 160, 255, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, 46, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = '#bff0ff';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(x, y, CONFIG.BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Лёгкое «дыхание» мяча, чтобы он не выглядел наклейкой.
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(x, y, CONFIG.BALL_RADIUS + 3 + Math.sin(time / 180) * 1.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(190, 240, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Эффекты                                                             */
/* ------------------------------------------------------------------ */

export function drawEffects(ctx, effects) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const effect of effects) {
        ctx.globalAlpha = effect.alpha;

        if (effect.type === 'spark') {
            // Вспышка: несколько коротких лучей из точки удара.
            for (let i = 0; i < 7; i += 1) {
                const angle = (Math.PI * 2 * i) / 7 + effect.spin;
                ctx.beginPath();
                ctx.moveTo(effect.x + Math.cos(angle) * effect.radius * 0.35,
                           effect.y + Math.sin(angle) * effect.radius * 0.35);
                ctx.lineTo(effect.x + Math.cos(angle) * effect.radius,
                           effect.y + Math.sin(angle) * effect.radius);
                ctx.strokeStyle = effect.color;
                ctx.lineWidth = effect.width;
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, Math.max(1, effect.radius * 0.5), 0, Math.PI * 2);
            ctx.fillStyle = effect.color;
            ctx.fill();
        } else {
            // shockwave и implosion — кольцо, меняющее радиус.
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, Math.max(0.5, effect.radius), 0, Math.PI * 2);
            ctx.strokeStyle = effect.color;
            ctx.lineWidth = effect.width;
            ctx.stroke();
        }
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Туман ограниченной видимости                                        */
/* ------------------------------------------------------------------ */

/**
 * Накладывает тьму за пределами радиуса вокруг управляемой ракетки.
 * Градиент начинается прозрачным и к краю радиуса уходит в почти чёрный,
 * поэтому переход плавный, без «обрыва» картинки.
 */
export function drawVisibility(ctx, cx, cy, radius) {
    const mask = ctx.createRadialGradient(cx, cy, radius * 0.52, cx, cy, radius);
    mask.addColorStop(0, 'rgba(3, 4, 12, 0)');
    mask.addColorStop(0.55, 'rgba(3, 4, 12, 0.16)');
    mask.addColorStop(0.8, 'rgba(3, 4, 12, 0.52)');
    mask.addColorStop(1, 'rgba(3, 4, 12, 0.92)');
    ctx.save();
    ctx.fillStyle = mask;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    // Едва заметная граница видимости — видно, что это радиус, а не баг.
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(90, 170, 255, 0.10)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Индикаторы состояний                                                */
/* ------------------------------------------------------------------ */

/**
 * Маркер над левой ракеткой. Пульсирует, когда мяч летит в её сторону,
 * и меняет цвет по расстоянию до мяча: синий → жёлтый → красный.
 */
export function drawThreatMarker(ctx, game, view, time) {
    const incoming = game.ball.vx < 0;
    const distance = Math.hypot(
        game.ball.x - (game.left.x + CONFIG.PADDLE_WIDTH / 2),
        game.ball.y - (view.leftY + CONFIG.PADDLE_HEIGHT / 2),
    );
    const color = distance < 100 ? '#ff4d5e' : distance < 200 ? '#ffd24d' : '#59b7ff';

    const pulse = incoming ? 0.5 + 0.5 * Math.sin(time / 110) : 0.18;
    const lift = 16 + pulse * 10;
    const cx = game.left.x + CONFIG.PADDLE_WIDTH / 2;
    const cy = view.leftY - lift;

    ctx.save();
    ctx.globalAlpha = incoming ? 0.55 + 0.45 * pulse : 0.45;
    ctx.shadowColor = color;
    ctx.shadowBlur = incoming ? 14 : 4;

    ctx.beginPath();
    ctx.moveTo(cx, cy + 10);                 // остриё вниз, к ракетке
    ctx.lineTo(cx - 9, cy - 2);
    ctx.lineTo(cx + 9, cy - 2);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // Текст-подсказка только когда мяч реально летит к нам.
    if (incoming) {
        ctx.shadowBlur = 0;
        ctx.font = 'bold 11px "Courier New", monospace';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText('МЯЧ К ВАМ', cx, cy - 10);
    }
    ctx.restore();
}

/** Пульсирующая подпись «ПОГЛОЩЕНИЕ» над дырой после попадания. */
export function drawAbsorbLabel(ctx, hole, time, strength) {
    if (strength <= 0) return;
    const pulse = 0.5 + 0.5 * Math.sin(time / 90);
    ctx.save();
    ctx.globalAlpha = Math.min(1, strength) * (0.55 + 0.45 * pulse);
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ffb347';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#ffcf70';
    ctx.fillText('ПОГЛОЩЕНИЕ', hole.x, hole.y - 52 - pulse * 6);
    ctx.restore();
}

/** Баннер конца партии и стартовый экран. */
export function drawBanner(ctx, game, time) {
    const isOver = game.state === 'OVER';
    const isMenu = game.state === 'MENU';
    if (!isOver && !isMenu) return;

    ctx.save();
    ctx.fillStyle = 'rgba(3, 4, 12, 0.62)';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    const cx = CONFIG.WIDTH / 2;
    const cy = CONFIG.HEIGHT / 2;

    if (isMenu) {
        ctx.textAlign = 'center';
        ctx.shadowColor = '#4fc3ff';
        ctx.shadowBlur = 24;
        ctx.fillStyle = '#eaf6ff';
        ctx.font = 'bold 52px "Courier New", monospace';
        ctx.fillText('ORBITAL PONG', cx, cy - 40);

        ctx.shadowBlur = 0;
        ctx.font = '18px "Courier New", monospace';
        ctx.fillStyle = 'rgba(200, 225, 255, 0.85)';
        ctx.fillText('W / S или мышь — левая ракетка', cx, cy + 24);
        ctx.fillText('ИИ играет за правую', cx, cy + 52);

        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time / 350);
        ctx.fillStyle = '#ffd24d';
        ctx.font = 'bold 20px "Courier New", monospace';
        ctx.fillText('SPACE — начать партию', cx, cy + 110);
        ctx.globalAlpha = 1;
        ctx.restore();
        return;
    }

    const playerWon = game.leftScore > game.rightScore;
    const winColor = playerWon ? PADDLE_COLORS.left : PADDLE_COLORS.right;

    ctx.fillStyle = 'rgba(6, 8, 20, 0.86)';
    roundRect(ctx, cx - 260, cy - 110, 520, 220, 18);
    ctx.fill();
    ctx.strokeStyle = winColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.shadowColor = winColor;
    ctx.shadowBlur = 22;
    ctx.fillStyle = winColor;
    ctx.font = 'bold 40px "Courier New", monospace';
    ctx.fillText(playerWon ? 'Победил игрок' : 'Победил ИИ', cx, cy - 24);

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(220, 235, 255, 0.9)';
    ctx.font = '22px "Courier New", monospace';
    ctx.fillText(`${game.leftScore} : ${game.rightScore}`, cx, cy + 24);

    ctx.globalAlpha = 0.55 + 0.45 * Math.sin(time / 320);
    ctx.fillStyle = '#ffd24d';
    ctx.font = '17px "Courier New", monospace';
    ctx.fillText('Space — новая партия', cx, cy + 76);
    ctx.globalAlpha = 1;
    ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Главная функция кадра                                               */
/* ------------------------------------------------------------------ */

/**
 * Полный кадр.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} scene {stars, trail, time, viewRadius, rings, anomalies, absorbUntil}
 * @param {import('../../js_core/js/game.js').Game} game
 * @param {{leftY:number,rightY:number,ballX:number,ballY:number}} view сглаженные позиции
 * @param {object} world {effects}
 */
export function render(ctx, scene, game, view, world) {
    const { time } = scene;

    drawBackground(ctx, scene.stars, time);
    drawField(ctx);

    drawOrbitRings(ctx, game.hole, game.mass, { time, enabled: scene.rings });
    drawHole(ctx, game.hole, game.mass, time);
    drawAnomalies(ctx, scene.anomalies, time);

    drawEffects(ctx, world.effects.items);
    drawPaddles(ctx, view, game);
    drawTrail(ctx, scene.trail);

    // Ограниченная видимость: всё, что ниже этой строки, рисуется поверх тумана.
    const eyeX = game.left.x + CONFIG.PADDLE_WIDTH / 2;
    const eyeY = view.leftY + CONFIG.PADDLE_HEIGHT / 2;
    drawVisibility(ctx, eyeX, eyeY, scene.viewRadius);

    // Мяч со свечением — единственное, что видно сквозь туман полностью.
    drawBall(ctx, view.ballX, view.ballY, time);

    // Правая ракетка остаётся призраком: без неё играть невозможно.
    drawPaddle(ctx, game.right.x, view.rightY, PADDLE_COLORS.right, 0.42);

    drawThreatMarker(ctx, game, view, time);

    const absorbLeft = Math.max(0, (scene.absorbUntil - time) / 900);
    drawAbsorbLabel(ctx, game.hole, time, absorbLeft);

    drawBanner(ctx, game, time);
}

/* ------------------------------------------------------------------ */
/* Сглаживание позиций между шагами                                    */
/* ------------------------------------------------------------------ */

/** Снимок позиций перед шагами — база для интерполяции. */
export function snapshot(game) {
    return {
        ballX: game.ball.x,
        ballY: game.ball.y,
        leftY: game.left.y,
        rightY: game.right.y,
    };
}

/**
 * Интерполяция между предыдущим и текущим шагом по alpha = accumulator / FIXED_DT.
 * Если объект «телепортировался» (подача, рестарт), скачок не сглаживаем.
 */
export function interpolate(view, game, previous, alpha) {
    const lerp = (from, to) => {
        if (Math.abs(to - from) > 120) return to;   // телепорт — без сглаживания
        return from + (to - from) * alpha;
    };

    view.ballX = lerp(previous.ballX, game.ball.x);
    view.ballY = lerp(previous.ballY, game.ball.y);
    view.leftY = lerp(previous.leftY, game.left.y);
    view.rightY = lerp(previous.rightY, game.right.y);
    return view;
}
