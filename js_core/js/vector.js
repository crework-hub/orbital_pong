/** Простые операции с вектором. Все функции возвращают новый объект. */

export class Vec {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    /** Длина вектора. */
    length() {
        return Math.hypot(this.x, this.y);
    }

    /** Новый вектор, умноженный на число. */
    scale(k) {
        return new Vec(this.x * k, this.y * k);
    }

    /** Новый вектор: сумма. */
    plus(other) {
        return new Vec(this.x + other.x, this.y + other.y);
    }

    /** Нормализованный вектор (длина 1). Нулевой вектор остаётся нулевым. */
    normalized() {
        const len = this.length();
        if (len === 0) return new Vec(0, 0);
        return new Vec(this.x / len, this.y / len);
    }

    toString() {
        return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
    }
}
