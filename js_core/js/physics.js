import { CONFIG } from './config.js';
import { Vec } from './vector.js';

export function distanceSquared(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
}

export function distance(x1, y1, x2, y2) {
    return Math.sqrt(distanceSquared(x1, y1, x2, y2));
}

// --- сила с softening ---
export function gravityForce(mass, d, G = CONFIG.GRAVITY, eps = CONFIG.SOFTENING) {
    if (mass <= 0) return 0;
    return (G * mass) / (d * d + eps * eps);
}

export function gravityAcceleration(x, y, holeX, holeY, mass, ballMass = CONFIG.BALL_MASS) {
    const dx = holeX - x;
    const dy = holeY - y;
    const d = Math.hypot(dx, dy);
    if (d === 0 || mass <= 0) return new Vec(0, 0);

    const acceleration = gravityForce(mass, d) / ballMass;
    return new Vec((acceleration * dx) / d, (acceleration * dy) / d);
}

// --- пороги ---
export function insideHole(x, y, holeX, holeY, radius = CONFIG.HOLE_RADIUS) {
    return distanceSquared(x, y, holeX, holeY) <= radius * radius;
}

export function segmentHitsCircle(x1, y1, x2, y2, cx, cy, radius = CONFIG.HOLE_RADIUS) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return insideHole(x1, y1, cx, cy, radius);

    let t = ((cx - x1) * dx + (cy - y1) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t));
    return insideHole(x1 + t * dx, y1 + t * dy, cx, cy, radius);
}
