const PRESETS = {
    spark: { maxRadius: 36, life: 380, shrink: false },
    shockwave: { maxRadius: 160, life: 720, shrink: false },
    implosion: { maxRadius: 90, life: 900, shrink: true },
    marker: { maxRadius: 0, life: 700, shrink: false },
};

export class Effect {
    constructor(type, x, y, color) {
        const preset = PRESETS[type] || PRESETS.spark;
        this.type = type;
        this.x = x;
        this.y = y;
        this.color = color;
        this.maxRadius = preset.maxRadius;
        this.shrink = preset.shrink;
        this.maxLife = preset.life;
        this.life = preset.life;
        this.alpha = 1;
        this.radius = preset.shrink ? preset.maxRadius : 0;
    }

    get progress() {
        return 1 - this.life / this.maxLife;
    }

    get done() {
        return this.life <= 0;
    }

    update(dt) {
        this.life = Math.max(0, this.life - dt);
        const t = this.progress;
        this.alpha = 1 - t;
        this.radius = this.shrink ? this.maxRadius * (1 - t) : this.maxRadius * (1 - (1 - t) ** 3);
    }
}

export class EffectSystem {
    constructor() {
        this.items = [];
    }

    spawn(type, x, y, color = '#ffffff') {
        this.items.push(new Effect(type, x, y, color));
    }

    update(dt) {
        for (const effect of this.items) effect.update(dt);
        this.items = this.items.filter((effect) => !effect.done);
    }

    clear() {
        this.items = [];
    }
}
