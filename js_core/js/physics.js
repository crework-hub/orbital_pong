/**
 * Расчёты по формулам варианта 15.
 *
 * Закон тяготения из ЛР 1:           F = G / d²
 * С массой чёрной дыры M:            F = G·M / d²
 * С softening-фактором (ЛР 4):       F = G·M / (d² + eps²)
 *
 * Softening нужен потому, что при d → 0 сила и ускорение уходят в бесконечность:
 * мяч получает огромную скорость за один кадр и вылетает за пределы экрана.
 * Слагаемое eps² ограничивает максимум силы величиной G·M / eps².
 */

import { CONFIG } from './config.js';
import { Vec } from './vector.js';

/**
 * Квадрат расстояния между двумя точками.
 * Считаем без корня — так дешевле и точнее.
 */
export function distanceSquared(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
}

/** Расстояние между двумя точками. */
export function distance(x1, y1, x2, y2) {
    return Math.sqrt(distanceSquared(x1, y1, x2, y2));
}

/**
 * Сила притяжения к чёрной дыре с учётом softening.
 * @param {number} mass  масса дыры
 * @param {number} d     расстояние до центра
 */
export function gravityForce(mass, d, G = CONFIG.GRAVITY, eps = CONFIG.SOFTENING) {
    if (mass <= 0) return 0;
    const denominator = d * d + eps * eps;
    return (G * mass) / denominator;
}

/**
 * Вектор ускорения мяча: направление на центр дыры, длина F / m.
 * Возвращает Vec, исходные координаты не меняются.
 */
export function gravityAcceleration(x, y, holeX, holeY, mass,
                                     ballMass = CONFIG.BALL_MASS,
                                     G = CONFIG.GRAVITY,
                                     eps = CONFIG.SOFTENING) {
    const dx = holeX - x;
    const dy = holeY - y;
    const d = Math.hypot(dx, dy);

    if (d === 0 || mass <= 0) return new Vec(0, 0);

    const force = gravityForce(mass, d, G, eps);
    const acceleration = force / ballMass;
    return new Vec((acceleration * dx) / d, (acceleration * dy) / d);
}

/** Пороговое условие: мяч упал в дыру. */
export function insideHole(x, y, holeX, holeY, radius = CONFIG.HOLE_RADIUS) {
    return distanceSquared(x, y, holeX, holeY) <= radius * radius;
}

/** Пороговое условие: мяч за линией ворот. */
export function behindGoalLine(x, width = CONFIG.WIDTH) {
    return x < 0 || x > width;
}

/**
 * Пересёк ли отрезок пути мяча окружность дыры.
 *
 * За кадр мяч может сдвинуться на десятки пикселей и «проскочить» дыру
 * между двумя кадрами: радиус дыры всего 10. Поэтому проверяем не точку,
 * а отрезок от старой позиции к новой — расстояние от центра до отрезка.
 */
export function segmentHitsCircle(x1, y1, x2, y2, cx, cy, radius = CONFIG.HOLE_RADIUS) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;

    // Мяч не двигался: проверяем саму точку.
    if (lengthSquared === 0) return insideHole(x1, y1, cx, cy, radius);

    // Ближайшая к центру точка отрезка (проекция), параметр t обрезан в [0, 1].
    let t = ((cx - x1) * dx + (cy - y1) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t));

    const nearestX = x1 + t * dx;
    const nearestY = y1 + t * dy;
    return distanceSquared(nearestX, nearestY, cx, cy) <= radius * radius;
}

/**
 * Сколько градусов мяч облетел вокруг центра за кадр.
 * Переход через ±180° обрабатывается, чтобы угол не «прыгал» на 360°.
 */
export function angleDelta(prevAngle, nextAngle) {
    let delta = nextAngle - prevAngle;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    return delta;
}
