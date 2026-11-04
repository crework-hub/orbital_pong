/**
 * Все константы ядра в одном месте.
 * Значения совпадают с physics.cfg и level.json из Python-версии игры.
 */

export const CONFIG = {
    // Поле, как в Pygame-версии
    WIDTH: 800,
    HEIGHT: 600,

    // Гравитационная постоянная из physics.cfg
    GRAVITY: 500,

    // Масса мяча из physics.cfg
    BALL_MASS: 1.0,

    // Радиус чёрной дыры: ближе мяч считается упавшим
    HOLE_RADIUS: 10,

    /**
     * Softening-фактор из задания ЛР 4.
     * Формула F = G·M / (d² + eps²) не даёт силе уйти в бесконечность,
     * когда d → 0. При eps = 6 максимальная сила равна G·M / 36.
     */
    SOFTENING: 6,

    // Скорость ракетки, пикселей за кадр
    PADDLE_SPEED: 6,

    // Размеры ракетки
    PADDLE_WIDTH: 16,
    PADDLE_HEIGHT: 100,
    PADDLE_MARGIN: 30,

    // Скорость подачи
    SERVE_VX: 6,
    SERVE_VY: 2,

    // До скольких очков играем
    WIN_SCORE: 5,

    // Радиус мяча
    BALL_RADIUS: 8,
};

/** Предельная сила притяжения при d → 0 (выводится из формулы, не подбирается). */
export const MAX_FORCE = (mass) => (CONFIG.GRAVITY * mass) / (CONFIG.SOFTENING ** 2);
