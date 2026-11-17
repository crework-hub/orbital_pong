import { CONFIG, MAX_FORCE } from './js/config.js';
import { Vec } from './js/vector.js';
import { Rect } from './js/rect.js';
import {
    gravityForce, gravityAcceleration, distance, distanceSquared,
    insideHole, segmentHitsCircle,
} from './js/physics.js';
import { Ball } from './js/ball.js';
import { Paddle } from './js/paddle.js';
import { State, StateMachine } from './js/state.js';
import { loadLevelFromText, validateLevel, DEFAULT_LEVEL } from './js/level.js';
import { Field, Zone } from './js/field.js';
import { Game } from './js/game.js';

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
    if (condition) passed += 1;
    else failed += 1;
    console.log(`  ${condition ? 'OK  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}

function group(title) {
    console.log(`\n${title}`);
}

const LEVEL = validateLevel({
    window: { width: 800, height: 600 },
    black_hole: { x: 400, y: 300, mass: 10 },
    paddle_margin: 30,
    win_score: 5,
}).level;

const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

// --- 1. геометрия ---
group('1. Геометрия: Rect и Vec');
const rect = new Rect(10, 20, 100, 50);
const moved = rect.move(5, -10);
check('right и bottom', rect.right === 110 && rect.bottom === 70);
check('move() возвращает копию', moved.x === 15 && moved.y === 10 && rect.x === 10 && rect.y === 20);
check('colliderect: пересечение', rect.colliderect(new Rect(100, 60, 30, 30)));
check('colliderect: касание краями — не пересечение', !rect.colliderect(new Rect(110, 20, 10, 10)));
check('collidepoint', rect.collidepoint(50, 40) && !rect.collidepoint(5, 40));
check('Rect.fromCircle', Rect.fromCircle(100, 100, 8).width === 16 && Rect.fromCircle(100, 100, 8).x === 92);
check('Vec: длина, сумма, масштаб',
      near(new Vec(3, 4).length(), 5) && new Vec(1, 2).plus(new Vec(2, 3)).x === 3 &&
      new Vec(1, 2).scale(3).y === 6);

// --- 2. расчёты ---
group('2. Расчёты: F = G·M / (d² + eps²)');
check('distance 3-4-5', distance(0, 0, 3, 4) === 5 && distanceSquared(0, 0, 3, 4) === 25);

const f100 = gravityForce(1, 100, 500, 0);
check('eps = 0: формула ЛР 1, F = G / d²', near(f100, 0.05), `F=${f100}`);
check('с eps = 6 на d = 100 сила почти та же',
      Math.abs(gravityForce(1, 100) - 0.05) / 0.05 < 0.01, `${gravityForce(1, 100).toFixed(5)}`);
check('монотонность: ближе — сильнее', gravityForce(10, 50) > gravityForce(10, 100));
check('масса растёт — сила растёт', gravityForce(20, 100) === 2 * gravityForce(10, 100));
check('d → 0: сила ограничена G·M / eps²', near(gravityForce(10, 0), MAX_FORCE(10)),
      `F(0)=${gravityForce(10, 0).toFixed(1)}`);
check('сила на d = 1e-9 не взрывается', Number.isFinite(gravityForce(10, 1e-9)) &&
      gravityForce(10, 1e-9) <= MAX_FORCE(10));
check('нулевая масса — нет силы', gravityForce(0, 50) === 0);

const acc = gravityAcceleration(200, 300, 400, 300, 10);
check('ускорение направлено на дыру', acc.x > 0 && acc.y === 0);
check('длина ускорения равна F / m', near(acc.length(), gravityForce(10, 200) / CONFIG.BALL_MASS));
check('мяч в центре дыры: ускорение нулевое', gravityAcceleration(400, 300, 400, 300, 10).length() === 0);

// --- 3. пороги и проскок ---
group('3. Пороги: падение в дыру');
check('insideHole: на границе радиуса', insideHole(410, 300, 400, 300));
check('insideHole: снаружи', !insideHole(411, 300, 400, 300));
check('отрезок через дыру пойман', segmentHitsCircle(300, 300, 500, 300, 400, 300));
check('отрезок мимо дыры не пойман', !segmentHitsCircle(300, 340, 500, 340, 400, 300));
check('отрезок не доходит до дыры', !segmentHitsCircle(300, 300, 380, 300, 400, 300));

// --- 4. сущности ---
group('4. Мяч и ракетка');
const ball = new Ball(200, 300);
ball.vx = 0;
ball.vy = 0;
ball.update(10, { x: 400, y: 300 });
check('мяч разгоняется к дыре', ball.vx > 0 && ball.x > 200, `vx=${ball.vx.toFixed(3)}`);

const fast = new Ball(385, 300);
fast.vx = 30;
fast.vy = 0;
fast.update(10, { x: 400, y: 300 });
check('быстрый мяч не проскакивает дыру (конец шага вне дыры)',
      fast.captured === true && Math.abs(fast.x - 400) > 10, `x=${fast.x.toFixed(1)}`);

const limited = new Ball(100, 300);
limited.vx = 100;
limited.vy = 0;
limited.update(10, { x: 400, y: 600 });
check('скорость мяча ограничена (меньше ширины ракетки + диаметра мяча)',
      limited.speed <= CONFIG.MAX_BALL_SPEED + 1e-9 &&
      CONFIG.MAX_BALL_SPEED < CONFIG.PADDLE_WIDTH + 2 * CONFIG.BALL_RADIUS,
      `${limited.speed.toFixed(1)}`);

const slow = new Ball(100, 100);
slow.update(10, { x: 400, y: 300 });
check('далёкий мяч не считается упавшим', slow.captured === false);

const paddle = new Paddle(30, 250, 600);
paddle.y = 3;
paddle.moveUp();
check('ракетка не выходит за верх', paddle.y === 0);
paddle.y = 590;
paddle.moveDown();
check('ракетка не выходит за низ', paddle.y === 500);
const ai = new Paddle(30, 0, 600);
for (let i = 0; i < 200; i += 1) ai.track(400);
check('track: ракетка встаёт на уровень цели', Math.abs(ai.rect.centerY - 400) <= 2,
      `центр ${ai.rect.centerY}`);

// --- 5. автомат ---
group('5. Конечный автомат MENU → PLAY → OVER');
const fsm = new StateMachine();
check('старт в MENU', fsm.is(State.MENU));
check('MENU → OVER запрещён', fsm.go(State.OVER) === false && fsm.is(State.MENU));
check('MENU → PLAY разрешён', fsm.go(State.PLAY) && fsm.is(State.PLAY));
check('PLAY → OVER разрешён', fsm.go(State.OVER) && fsm.is(State.OVER));
check('OVER → PLAY (реванш)', fsm.go(State.PLAY));
check('история переходов', fsm.history.join('>') === 'MENU>PLAY>OVER>PLAY');

// --- 6. уровень ---
group('6. Загрузка уровня из JSON');
const good = loadLevelFromText(JSON.stringify(LEVEL));
check('корректный JSON — без ошибок', good.errors.length === 0 && good.level.win_score === 5);
const broken = loadLevelFromText('{ это не json');
check('битый JSON — уровень по умолчанию', broken.errors.length === 1 &&
      broken.level.window.width === DEFAULT_LEVEL.window.width, broken.errors[0]);
const badValue = loadLevelFromText(JSON.stringify({ ...LEVEL, win_score: 'пять' }));
check('неверный тип поля — значение по умолчанию', badValue.level.win_score === 5 && badValue.errors.length === 1);
const outOfRange = loadLevelFromText(JSON.stringify({ ...LEVEL, win_score: 500 }));
check('значение вне диапазона отклонено', outOfRange.level.win_score === 5 && outOfRange.errors.length === 1);
const noHole = loadLevelFromText(JSON.stringify({ window: LEVEL.window, paddle_margin: 30, win_score: 5 }));
check('нет обязательных полей — ошибки по каждому', noHole.errors.length === 3, `${noHole.errors.length}`);
const holeOut = validateLevel({ ...LEVEL, black_hole: { x: 5000, y: 300, mass: 10 } });
check('дыра вне поля возвращается в центр', holeOut.level.black_hole.x === 400 && holeOut.errors.length === 1);
check('массив вместо объекта отклонён', validateLevel([]).errors.length === 1);

// --- 7. поле ---
group('7. Игровое поле');
const field = new Field(LEVEL);
check('обычная точка', field.locate(200, 200) === Zone.FIELD);
check('точка в дыре', field.locate(400, 300) === Zone.HOLE);
check('верхняя стена', field.locate(200, 5) === Zone.TOP_WALL);
check('нижняя стена', field.locate(200, 595) === Zone.BOTTOM_WALL);
check('левые ворота', field.locate(-1, 300) === Zone.LEFT_GOAL);
check('правые ворота', field.locate(801, 300) === Zone.RIGHT_GOAL);
check('расстояние до дыры', near(field.distanceToHole(400, 400), 100));
const edge = new Ball(200, 3);
edge.vy = -4;
check('отскок от потолка', field.bounceWalls(edge) && edge.vy > 0 && edge.y === edge.radius);
check('в центре отскока нет', field.bounceWalls(new Ball(200, 300)) === false);

// --- 8. игра ---
group('8. Игровой цикл');
const idle = new Game(LEVEL);
idle.step({});
check('до старта шаг ничего не делает', idle.frames === 0 && idle.state === State.MENU);

const game = new Game(LEVEL);
game.start();
check('start переводит в PLAY', game.state === State.PLAY && game.events[0].type === 'start');
const before = game.left.y;
game.step({ leftUp: true });
check('ввод двигает левую ракетку', game.left.y === before - CONFIG.PADDLE_SPEED);

const hit = new Game(LEVEL);
hit.start();
hit.ball.x = hit.left.x + hit.left.width + 2;
hit.ball.y = hit.left.rect.centerY;
hit.ball.vx = -4;
hit.ball.vy = 0;
hit.step({});
check('отскок от ракетки меняет vx и пишет событие',
      hit.ball.vx > 0 && hit.events.some((e) => e.type === 'paddle-hit' && e.side === 'left'));

const goal = new Game(LEVEL);
goal.start();
goal.left.y = 0;
goal.ball.x = 3;
goal.ball.y = 580;
goal.ball.vx = -20;
goal.ball.vy = 0;
goal.step({});
check('мяч за левыми воротами — очко правому', goal.rightScore === 1 && goal.leftScore === 0);
check('после гола подача заново', goal.ball.x === 200 && goal.ball.y === 300);

const catcher = new Game(LEVEL);
catcher.start();
catcher.ball.x = 385;
catcher.ball.y = 300;
catcher.ball.vx = 30;
catcher.ball.vy = 0;
catcher.step({});
check('падение в дыру без отбития: событие, подача заново, очков нет',
      catcher.events.some((e) => e.type === 'hole-catch') &&
      catcher.leftScore === 0 && catcher.rightScore === 0 && catcher.ball.x === 200);

const blame = new Game(LEVEL);
blame.start();
blame.lastHit = 'left';
blame.ball.x = 385;
blame.ball.y = 300;
blame.ball.vx = 30;
blame.ball.vy = 0;
blame.step({});
check('дыра съела мяч после удара левого — очко правому', blame.rightScore === 1 && blame.leftScore === 0);

const wall = new Game(LEVEL);
wall.start();
wall.ball.x = 200;
wall.ball.y = 5;
wall.ball.vy = -3;
wall.step({});
check('отскок от стены пишет событие', wall.events.some((e) => e.type === 'wall-bounce'));

const match = new Game(LEVEL);
match.start();
for (let i = 0; i < 5; i += 1) {
    match.ball.x = -5;
    match.ball.y = 20;
    match.step({});
    if (match.state === State.OVER) break;
}
check('партия заканчивается на 5 очках', match.state === State.OVER && match.rightScore === 5);
check('победитель записан в событие game-over', match.events.at(-1).winner === 'right');
match.start();
check('после OVER можно начать заново', match.state === State.PLAY && match.rightScore === 0);

const long = new Game(LEVEL);
long.start();
for (let i = 0; i < 20000 && long.state === State.PLAY; i += 1) {
    long.right.track(long.ball.y);
    long.left.track(long.ball.y);
    long.step({});
}
check('мяч не улетает в NaN за 20000 шагов',
      Number.isFinite(long.ball.x) && Number.isFinite(long.ball.y) && Number.isFinite(long.ball.vx));
check('журнал событий ограничен', long.events.length <= 200);

console.log(`\nВсего проверок: ${passed + failed}`);
console.log(`Успешно: ${passed}`);
console.log(`Провалено: ${failed}`);
console.log(failed === 0 ? '\nВСЕ ПРОВЕРКИ ПРОШЛИ' : '\nЕСТЬ ОШИБКИ');
process.exit(failed === 0 ? 0 : 1);
