/**
 * Собственный прямоугольник в стиле pygame.Rect.
 * Все методы move() возвращают НОВЫЙ прямоугольник, исходный не меняется.
 */
export class Rect {
    constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    /** Правый край (x + width). */
    get right() {
        return this.x + this.width;
    }

    /** Нижний край (y + height). */
    get bottom() {
        return this.y + this.height;
    }

    get centerX() {
        return this.x + this.width / 2;
    }

    get centerY() {
        return this.y + this.height / 2;
    }

    /** Копия прямоугольника, сдвинутая на dx, dy. */
    move(dx, dy) {
        return new Rect(this.x + dx, this.y + dy, this.width, this.height);
    }

    /** Копия прямоугольника с другими размерами по центру. */
    inflate(dw, dh) {
        return new Rect(this.x - dw / 2, this.y - dh / 2,
                        this.width + dw, this.height + dh);
    }

    /** Пересечение двух прямоугольников (как pygame colliderect). */
    colliderect(other) {
        return this.x < other.right && this.right > other.x &&
               this.y < other.bottom && this.bottom > other.y;
    }

    /** Попадает ли точка внутрь (как pygame collidepoint). */
    collidepoint(px, py) {
        return px >= this.x && px < this.right && py >= this.y && py < this.bottom;
    }

    /** Прямоугольник по центру и радиусу — для мяча. */
    static fromCircle(cx, cy, radius) {
        return new Rect(cx - radius, cy - radius, radius * 2, radius * 2);
    }

    toString() {
        return `Rect(${this.x}, ${this.y}, ${this.width}, ${this.height})`;
    }
}
