/**
 * Конечный автомат игры: MENU → PLAY → OVER.
 * Состояния и переходы — как в Python-версии (game.py).
 */

export const State = Object.freeze({
    MENU: 'MENU',
    PLAY: 'PLAY',
    OVER: 'OVER',
});

/** Какие переходы разрешены. Всё, чего тут нет, — ошибка. */
export const TRANSITIONS = Object.freeze({
    [State.MENU]: [State.PLAY],
    [State.PLAY]: [State.OVER, State.MENU],
    [State.OVER]: [State.MENU, State.PLAY],
});

export class StateMachine {
    constructor(initial = State.MENU) {
        this.state = initial;
        this.history = [initial];   // «чёрный ящик»: куда переходили
    }

    /** Можно ли перейти в next. */
    can(next) {
        return (TRANSITIONS[this.state] || []).includes(next);
    }

    /** Переход. Возвращает false, если переход запрещён. */
    go(next) {
        if (!this.can(next)) return false;
        this.state = next;
        this.history.push(next);
        return true;
    }

    is(state) {
        return this.state === state;
    }
}
