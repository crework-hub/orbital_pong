export const State = Object.freeze({
    MENU: 'MENU',
    PLAY: 'PLAY',
    OVER: 'OVER',
});

export const TRANSITIONS = Object.freeze({
    [State.MENU]: [State.PLAY],
    [State.PLAY]: [State.OVER, State.MENU],
    [State.OVER]: [State.MENU, State.PLAY],
});

export class StateMachine {
    constructor(initial = State.MENU) {
        this.state = initial;
        this.history = [initial];
    }

    can(next) {
        return (TRANSITIONS[this.state] || []).includes(next);
    }

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
