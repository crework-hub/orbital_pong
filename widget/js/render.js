import { MAX_FORCE } from '../../js_core/js/config.js';
import { gravityForce } from '../../js_core/js/physics.js';

const BG = '#05060f';
const RING_RADII = [30, 70, 110, 150, 190, 230, 270, 310];
const REFERENCE_FORCE = gravityForce(10, RING_RADII[0]);

export function makeStars(count, width, height) {
    const stars = [];
    let seed = 7;
    const random = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
    };
    for (let i = 0; i < count; i += 1) {
        stars.push({ x: random() * width, y: random() * height, size: 0.5 + random() * 1.2 });
    }
    return stars;
}

// --- прозрачность колец ---
export function ringAlpha(mass, radius) {
    const share = Math.min(1, gravityForce(mass, radius) / REFERENCE_FORCE);
    return 0.08 + 0.9 * share ** 0.35;
}

function drawRings(ctx, hole, mass, time) {
    ctx.lineWidth = 1.5;
    RING_RADII.forEach((radius, index) => {
        ctx.strokeStyle = `rgba(130, 170, 255, ${ringAlpha(mass, radius)})`;
        ctx.setLineDash([6, 10]);
        ctx.lineDashOffset = (index % 2 ? 1 : -1) * time * 0.01;
        ctx.beginPath();
        ctx.arc(hole.x, hole.y, radius, 0, Math.PI * 2);
        ctx.stroke();
    });
    ctx.setLineDash([]);
}

function drawHole(ctx, hole) {
    const glow = ctx.createRadialGradient(hole.x, hole.y, 8, hole.x, hole.y, 42);
    glow.addColorStop(0, 'rgba(170, 100, 255, 0.55)');
    glow.addColorStop(1, 'rgba(170, 100, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, 42, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.strokeStyle = '#b07cff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
}

function drawBall(ctx, ball, trail) {
    trail.forEach((point, index) => {
        const fade = (index + 1) / trail.length;
        ctx.fillStyle = `rgba(110, 170, 255, ${fade * 0.45})`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, ball.radius * fade * 0.8, 0, Math.PI * 2);
        ctx.fill();
    });

    const heat = Math.min(1, Math.max(0, (ball.speed - 4) / 10));
    ctx.fillStyle = `rgb(${Math.round(120 + 135 * heat)}, ${Math.round(210 - 70 * heat)}, ${Math.round(255 - 160 * heat)})`;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
}

function drawEffects(ctx, effects) {
    for (const effect of effects.items) {
        if (effect.type === 'marker') {
            ctx.fillStyle = effect.color;
            ctx.globalAlpha = effect.alpha;
            ctx.font = 'bold 22px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('!', effect.x, effect.y - 24 * effect.progress);
            ctx.globalAlpha = 1;
            continue;
        }
        // rgba с alpha вместо globalAlpha: цвет и прозрачность в одной строке
        ctx.strokeStyle = hexToRgba(effect.color, effect.alpha);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, Math.max(0, effect.radius), 0, Math.PI * 2);
        ctx.stroke();
    }
}

function hexToRgba(hex, alpha) {
    const value = parseInt(hex.slice(1), 16);
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha.toFixed(3)})`;
}

// --- ограниченная видимость ---
function drawFog(ctx, width, height, center, radius) {
    const fog = ctx.createRadialGradient(center.x, center.y, radius * 0.6, center.x, center.y, radius);
    fog.addColorStop(0, 'rgba(3, 4, 12, 0)');
    fog.addColorStop(1, 'rgba(3, 4, 12, 0.92)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, width, height);
}

function drawOverlay(ctx, game) {
    if (game.state === 'PLAY') return;
    const { width, height } = game.field;
    ctx.fillStyle = 'rgba(5, 6, 15, 0.6)';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#e6f0ff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 40px sans-serif';
    if (game.state === 'MENU') {
        ctx.fillText('Orbital Pong', width / 2, height / 2 - 20);
        ctx.font = '20px sans-serif';
        ctx.fillText('Space — старт', width / 2, height / 2 + 20);
    } else {
        const winner = game.leftScore > game.rightScore ? 'Ты победил' : 'Победил ИИ';
        ctx.fillText(winner, width / 2, height / 2 - 20);
        ctx.font = '20px sans-serif';
        ctx.fillText(`${game.leftScore} : ${game.rightScore} · R — ещё раз`, width / 2, height / 2 + 20);
    }
}

export function render(ctx, scene, game, effects) {
    const { width, height } = game.field;

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#9fb4e8';
    for (const star of scene.stars) ctx.fillRect(star.x, star.y, star.size, star.size);

    if (scene.settings.rings) drawRings(ctx, game.hole, game.mass, scene.time);
    drawHole(ctx, game.hole);

    ctx.fillStyle = '#7ad9ff';
    ctx.fillRect(game.left.x, game.left.y, game.left.width, game.left.height);
    ctx.fillStyle = '#ff8ec4';
    ctx.fillRect(game.right.x, game.right.y, game.right.width, game.right.height);

    drawBall(ctx, game.ball, scene.trail);
    drawEffects(ctx, effects);

    drawFog(ctx, width, height, { x: game.left.rect.centerX, y: game.left.rect.centerY },
            scene.settings.viewRadius);
    drawOverlay(ctx, game);
}
