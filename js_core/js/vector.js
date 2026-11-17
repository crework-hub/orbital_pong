export class Vec {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    length() {
        return Math.hypot(this.x, this.y);
    }

    scale(k) {
        return new Vec(this.x * k, this.y * k);
    }

    plus(other) {
        return new Vec(this.x + other.x, this.y + other.y);
    }
}
