export class Rect {
    constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    get right() {
        return this.x + this.width;
    }

    get bottom() {
        return this.y + this.height;
    }

    get centerX() {
        return this.x + this.width / 2;
    }

    get centerY() {
        return this.y + this.height / 2;
    }

    move(dx, dy) {
        return new Rect(this.x + dx, this.y + dy, this.width, this.height);
    }

    colliderect(other) {
        return this.x < other.right && this.right > other.x &&
               this.y < other.bottom && this.bottom > other.y;
    }

    collidepoint(px, py) {
        return px >= this.x && px < this.right && py >= this.y && py < this.bottom;
    }

    static fromCircle(cx, cy, radius) {
        return new Rect(cx - radius, cy - radius, radius * 2, radius * 2);
    }
}
