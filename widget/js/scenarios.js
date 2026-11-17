import { gravityForce, distance } from '../../js_core/js/physics.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function num(value, fallback) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

// --- реестр сценариев ---
export function createScenarios({ game, effects, scene, logElement }) {
    const settings = scene.settings;

    const registry = {
        restart() {
            game.start();
            scene.trail.length = 0;
            effects.clear();
            return 'новая партия';
        },

        setMass(value) {
            game.mass = clamp(num(value, game.mass), 0.1, 1000);
            return `масса дыры ${game.mass}`;
        },

        setVisibility(px) {
            settings.viewRadius = clamp(num(px, settings.viewRadius), 100, 1200);
            return `радиус видимости ${settings.viewRadius} px`;
        },

        toggleRings() {
            settings.rings = !settings.rings;
            return settings.rings ? 'кольца включены' : 'кольца выключены';
        },

        slowMotion(k) {
            settings.timeScale = clamp(num(k, 1), 0.25, 2);
            return `ход времени ×${settings.timeScale}`;
        },

        fastBall(k) {
            const boost = clamp(num(k, 1), 1, 3);
            game.ball.vx *= boost;
            game.ball.vy *= boost;
            return `скорость мяча ×${boost}`;
        },

        toggleAI() {
            settings.autopilot = !settings.autopilot;
            return settings.autopilot ? 'автопилот включён' : 'автопилот выключен';
        },

        showEvents() {
            const last = game.events.slice(-8);
            for (const event of last) {
                const extra = event.side ? ` (${event.side})` : '';
                log(`  кадр ${event.frame}: ${event.type}${extra}`);
            }
            return `событий показано: ${last.length}`;
        },

        info() {
            const { ball } = game;
            return {
                state: game.state,
                score: `${game.leftScore}:${game.rightScore}`,
                mass: game.mass,
                speed: Number(ball.speed.toFixed(2)),
                force: Number(gravityForce(game.mass, distance(ball.x, ball.y, game.hole.x, game.hole.y)).toFixed(3)),
                viewRadius: settings.viewRadius,
                rings: settings.rings,
                timeScale: settings.timeScale,
                autopilot: settings.autopilot,
            };
        },
    };

    function log(text) {
        console.log(text);
        if (!logElement) return;
        const line = document.createElement('div');
        line.textContent = text;
        logElement.append(line);
        while (logElement.childElementCount > 60) logElement.firstElementChild.remove();
        logElement.scrollTop = logElement.scrollHeight;
    }

    function run(name, ...args) {
        const scenario = registry[name];
        if (!scenario) {
            log(`нет сценария «${name}». Список: ${Object.keys(registry).join(', ')}`);
            return undefined;
        }
        try {
            const result = scenario(...args);
            log(`${name}(${args.join(', ')}) → ${typeof result === 'string' ? result : JSON.stringify(result)}`);
            return result;
        } catch (error) {
            log(`ошибка в «${name}»: ${error.message}`);
            return undefined;
        }
    }

    return { run, list: () => Object.keys(registry), info: () => run('info') };
}
