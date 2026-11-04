/**
 * Модель эффектов ЛР 5.
 *
 * Модуль ничего не рисует — он только ведёт жизненный цикл частиц:
 * сколько им жить, какого они радиуса и с какой прозрачностью.
 * Рисует их render.js («модель решает, виджет рисует»).
 */

/** Заготовки под каждый тип эффекта. */
export const EFFECT_PRESETS = {
    // Вспышка от удара по ракетке: короткая и яркая.
    spark: { maxRadius: 38, maxLife: 380, width: 2.5, shrink: false },
    // Гол: широкое расходящееся кольцо.
    shockwave: { maxRadius: 165, maxLife: 720, width: 3, shrink: false },
    // Мяч упал в дыру: кольцо сжимается внутрь и гаснет.
    implosion: { maxRadius: 92, maxLife: 900, width: 3, shrink: true },
};

export class Effect {
    /**
     * @param {string} type  ключ из EFFECT_PRESETS
     * @param {number} x     центр по X
     * @param {number} y     центр по Y
     * @param {string} color цвет в формате #rrggbb
     */
    constructor(type, x, y, color) {
        const preset = EFFECT_PRESETS[type] || EFFECT_PRESETS.spark;

        this.type = type;
        this.x = x;
        this.y = y;
        this.color = color;

        this.maxRadius = preset.maxRadius;
        this.radius = preset.shrink ? preset.maxRadius : 0;
        this.width = preset.width;
        this.shrink = preset.shrink;

        this.maxLife = preset.maxLife;
        this.life = preset.maxLife;    // остаток жизни в миллисекундах
        this.alpha = 1;

        // Немного разброса, чтобы одинаковые вспышки не выглядели копией.
        this.spin = (Math.random() - 0.5) * 1.6;
    }

    /** Доля прожитой жизни: 0 — только родился, 1 — пора удалять. */
    get progress() {
        return 1 - this.life / this.maxLife;
    }

    /**
     * Шаг жизни эффекта.
     * alpha линейно спадает от 1 до 0, радиус растёт (или сжимается у implosion).
     * @param {number} dt миллисекунды
     */
    update(dt) {
        this.life = Math.max(0, this.life - dt);

        const t = this.progress;
        this.alpha = Math.max(0, 1 - t);

        if (this.shrink) {
            this.radius = this.maxRadius * (1 - t);
        } else {
            // easeOutCubic: эффект резко вспыхивает и потом замедляется
            const ease = 1 - Math.pow(1 - t, 3);
            this.radius = this.maxRadius * ease;
        }
    }

    /** Эффект отработал и его можно выбросить из массива. */
    get done() {
        return this.alpha <= 0.001 || this.life <= 0;
    }
}

/** Массив эффектов и точка их создания. */
export class EffectSystem {
    constructor() {
        this.items = [];
    }

    /**
     * Создать эффект.
     * @returns {Effect}
     */
    spawn(type, x, y, color = '#ffffff') {
        const effect = new Effect(type, x, y, color);
        this.items.push(effect);
        return effect;
    }

    /** Шаг всех эффектов + автоудаление погасших. */
    update(dt) {
        for (const effect of this.items) effect.update(dt);
        this.items = this.items.filter((effect) => !effect.done);
    }

    clear() {
        this.items.length = 0;
    }

    get count() {
        return this.items.length;
    }
}
