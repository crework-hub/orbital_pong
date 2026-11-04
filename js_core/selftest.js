/**
 * Самопроверка ядра: 24 проверки ключевых механик.
 * Запуск: node selftest.js
 */

import { CONFIG, MAX_FORCE } from './js/config.js';
import { Vec } from './js/vector.js';
import { Rect } from './js/rect.js';
import {
    gravityForce, gravityAcceleration, distance, distanceSquared,
    insideHole, behindGoalLine, angleDelta,
} from './js/physics.js';
import { Ball, Paddle } from './js/bodies.js';
import { State, StateMachine } from './js/state.js';
import { loadLevelFromText, validateLevel, DEFAULT_LEVEL } from './js/level.js';
import { Game } from './js/game.js';
import { Field, Zone } from './js/field.js';

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
    if (condition) {
        passed += 1;
        console.log(`  OK   ${name}${detail ? ' — ' + detail : ''}`);
    } else {
        failed += 1;
        console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`);
    }
}

function group(title) {
    console.log(`\n${title}`);
}

const LEVEL = {
    window: { width: 800, height: 600 },
    black_hole: { x: 400, y: 300, mass: 10 },
    paddle_margin: 30,
    win_score: 5,
};

// ---------- 1. Геометрия ----------
group('1. Геометрия: Rect и Vec');

const rect = new Rect(10, 20, 100, 50);
check('Rect.right и Rect.bottom считаются верно', rect.right === 110 && rect.bottom === 70,
      `${rect.right}, ${rect.bottom}`);

const moved = rect.move(5, -10);
check('move() возвращает копию, а не меняет исходный', moved.x === 15 && rect.x === 10,
      `новый x=${moved.x}, старый x=${rect.x}`);

check('colliderect: пересекающиеся прямоугольники',
      rect.colliderect(new Rect(100, 60, 30, 30)) === true);
check('colliderect: касание краями не считается пересечением',
      rect.colliderect(new Rect(110, 20, 10, 10)) === false);
check('collidepoint: точка внутри и снаружи',
      rect.collidepoint(50, 40) === true && rect.collidepoint(5, 40) === false);

const v = new Vec(3, 4);
check('Vec.length: 3-4-5', v.length() === 5, `${v.length()}`);
check('Vec.normalized даёт длину 1', Math.abs(v.normalized().length() - 1) < 1e-9);
check('Vec.scale не мутирует исходный вектор', v.scale(2).x === 6 && v.x === 3);

// ---------- 2. Расчёты и пороги ----------
group('2. Расчёты по формулам варианта 15');

check('distanceSquared(0,0,3,4) = 25', distanceSquared(0, 0, 3, 4) === 25);
check('distance(0,0,3,4) = 5', distance(0, 0, 3, 4) === 5);

// F = G·M / (d² + eps²): при d = 100 и M = 10: 5000 / (10000 + 36)
const force100 = gravityForce(10, 100);
const expected100 = (500 * 10) / (100 * 100 + 36);
check('gravityForce на эталонном значении', Math.abs(force100 - expected100) < 1e-9,
      `${force100.toFixed(5)}`);

check('сила убывает с расстоянием (монотонность)',
      gravityForce(10, 50) > gravityForce(10, 100) &&
      gravityForce(10, 100) > gravityForce(10, 200));

check('при d = 0 сила ограничена softening-фактором',
      Math.abs(gravityForce(10, 0) - MAX_FORCE(10)) < 1e-9,
      `максимум ${MAX_FORCE(10).toFixed(2)}`);

check('масса 0 даёт нулевую силу', gravityForce(0, 10) === 0);

const acc = gravityAcceleration(300, 300, 400, 300, 10);
check('ускорение направлено к центру дыры', acc.x > 0 && Math.abs(acc.y) < 1e-9,
      `a = ${acc.toString()}`);

check('ускорение = сила / масса мяча',
      Math.abs(acc.length() - gravityForce(10, 100) / CONFIG.BALL_MASS) < 1e-9);

check('порог дыры: точка на радиусе — уже внутри', insideHole(410, 300, 400, 300) === true);
check('порог дыры: точка чуть дальше — снаружи', insideHole(411, 300, 400, 300) === false);
check('порог ворот: x < 0 и x > width', behindGoalLine(-1) && behindGoalLine(801) &&
      !behindGoalLine(400));

check('angleDelta сглаживает переход через 180°',
      Math.abs(angleDelta(Math.PI - 0.1, -Math.PI + 0.1) - 0.2) < 1e-9);

// ---------- 2b. Дополнительные аномалии ----------
group('2b. Дополнительные аномалии (ЛР 6/7)');

const pullBall = new Ball(200, 300);
const pullBase = pullBall.vx;
pullBall.update(0, { x: 400, y: 300 }, [{ x: 300, y: 300, mass: 10, type: 'black' }]);
check('чёрная аномалия притягивает мяч', pullBall.vx > pullBase && pullBall.vx > 0,
      `vx=${pullBall.vx.toFixed(2)}`);

const pushBall = new Ball(200, 300);
pushBall.vx = 0;
pushBall.vy = 0;
pushBall.update(0, { x: 400, y: 300 }, [{ x: 300, y: 300, mass: 10, type: 'white' }]);
check('белая аномалия отталкивает мяч', pushBall.vx < 0, `vx=${pushBall.vx.toFixed(2)}`);

const neutralBall = new Ball(200, 300);
neutralBall.update(0, { x: 400, y: 300 }, []);
check('без аномалий поведение не меняется', neutralBall.vx === 6, `vx=${neutralBall.vx}`);

// ---------- 3. Сущности ----------
group('3. Мяч и ракетка');

const ball = new Ball(100, 300);
const beforeSpeed = ball.speed;
ball.update(10, { x: 400, y: 300 });
check('мяч ускоряется к дыре', ball.x > 100, `x=${ball.x.toFixed(1)}`);
check('скорость мяча растёт при притяжении', ball.speed > beforeSpeed);

const wallBall = new Ball(100, 5);
wallBall.vy = -3;
const bounced = wallBall.update(0, { x: 400, y: 300 });
check('мяч отскакивает от верхней стены', bounced === true && wallBall.vy > 0);

const holeBall = new Ball(CONFIG.WIDTH / 4, CONFIG.HEIGHT / 2);
check('reset ставит мяч левее дыры, а не в неё',
      holeBall.x === CONFIG.WIDTH / 4 && !holeBall.fellIntoHole({ x: 400, y: 300 }),
      `x=${holeBall.x}`);

const paddle = new Paddle(30, 250);
paddle.moveUp();
const afterUp = paddle.y;
paddle.moveDown();
check('ракетка двигается вверх и вниз', afterUp === 244 && paddle.y === 250, `y=${paddle.y}`);
paddle.y = 0;
paddle.moveUp();
check('ракетка не выходит за верхнюю границу', paddle.y === 0);

// ---------- 4. Автомат состояний ----------
group('4. Конечный автомат');

const fsm = new StateMachine();
check('стартовое состояние MENU', fsm.is(State.MENU));
check('переход MENU → PLAY разрешён', fsm.go(State.PLAY) === true && fsm.is(State.PLAY));
check('переход PLAY → OVER разрешён', fsm.go(State.OVER) === true);
check('переход OVER → PLAY разрешён (новая партия)', fsm.go(State.PLAY) === true);
check('история переходов ведётся', fsm.history.length === 3 + 1, fsm.history.join('→'));

const wrong = new StateMachine(State.MENU);
check('нельзя прыгнуть MENU → OVER', wrong.go(State.OVER) === false && wrong.is(State.MENU));

// ---------- 5. Уровень из JSON ----------
group('5. Загрузка уровня с валидацией');

const good = loadLevelFromText(JSON.stringify(LEVEL));
check('правильный JSON загружается без ошибок', good.errors.length === 0, JSON.stringify(good.level.black_hole));
check('поля уровня прочитаны', good.level.black_hole.mass === 10 && good.level.win_score === 5);

const broken = loadLevelFromText('{ "window": { "width": 800, ');
check('битый JSON не роняет программу', broken.errors.length === 1 &&
      broken.level.window.width === DEFAULT_LEVEL.window.width, broken.errors[0]);

const badField = validateLevel({ ...LEVEL, win_score: 9999 });
check('неверное значение поля заменяется значением по умолчанию',
      badField.level.win_score === DEFAULT_LEVEL.win_score && badField.errors.length === 1,
      badField.errors[0]);

const outside = validateLevel({ ...LEVEL, black_hole: { x: 9999, y: 300, mass: 10 } });
check('дыра вне поля возвращается в центр',
      outside.level.black_hole.x === 400 && outside.errors.length === 1);

// ---------- 5b. Игровое поле ----------
group('5b. Игровое поле: зоны и стены');

const field = new Field(validateLevel(LEVEL).level);
check('центр поля — обычная точка', field.locate(200, 200) === Zone.FIELD);
check('точка в дыре опознаётся', field.locate(400, 300) === Zone.HOLE);
check('мяч у верхней стены — TOP_WALL', field.locate(200, 5) === Zone.TOP_WALL);
check('мяч у нижней стены — BOTTOM_WALL', field.locate(200, 595) === Zone.BOTTOM_WALL);
check('мяч за левым краем — гол', field.locate(-1, 300) === Zone.LEFT_GOAL);
check('мяч за правым краем — гол', field.locate(801, 300) === Zone.RIGHT_GOAL);
check('расстояние до дыры считается', Math.abs(field.distanceToHole(400, 400) - 100) < 1e-9,
      `${field.distanceToHole(400, 400)}`);

const edgeBall = new Ball(200, 3);
edgeBall.vy = -4;
check('Field.bounceWalls отражает мяч от потолка', field.bounceWalls(edgeBall) === true &&
      edgeBall.vy > 0 && edgeBall.y === edgeBall.radius, `y=${edgeBall.y}, vy=${edgeBall.vy}`);
check('Field.bounceWalls не трогает мяч в центре поля',
      field.bounceWalls(new Ball(200, 300)) === false);

// ---------- 6. Игровой цикл ----------
group('6. Игровой цикл и условия конца партии');

const game = new Game(validateLevel(LEVEL).level);
check('до start() игра в меню и не шагает', (game.step({}), game.frames === 0 && game.state === State.MENU));

game.start();
check('после start() состояние PLAY', game.state === State.PLAY);

for (let i = 0; i < 3000 && game.state === State.PLAY; i += 1) game.step({});
check('партия заканчивается при достижении win_score',
      game.state === State.OVER && Math.max(game.leftScore, game.rightScore) >= 5,
      `счёт ${game.leftScore}:${game.rightScore}`);

check('события пишутся в «чёрный ящик»', game.events.some((e) => e.type === 'goal') &&
      game.events.some((e) => e.type === 'game-over'), `событий ${game.events.length}`);

const inputGame = new Game(validateLevel(LEVEL).level);
inputGame.start();
const startY = inputGame.left.y;
for (let i = 0; i < 5; i += 1) inputGame.step({ leftDown: true });
check('ввод управляет левой ракеткой', inputGame.left.y > startY,
      `${startY} → ${inputGame.left.y}`);

const holeGame = new Game(validateLevel(LEVEL).level);
holeGame.start();
holeGame.ball.x = holeGame.hole.x + 5;
holeGame.ball.y = holeGame.hole.y;
holeGame.ball.vx = 0;
holeGame.ball.vy = 0;
holeGame.step({});
check('попадание в чёрную дыру фиксируется событием',
      holeGame.events.some((e) => e.type === 'hole-catch'));

const anomalyGame = new Game(validateLevel(LEVEL).level);
anomalyGame.start();
anomalyGame.anomalies = [{ x: 300, y: 300, mass: 10, type: 'white' }];
const anomalyVx = anomalyGame.ball.vx;
anomalyGame.step({});
check('Game.step учитывает аномалии поля', anomalyGame.ball.vx !== anomalyVx,
      `vx ${anomalyVx} → ${anomalyGame.ball.vx.toFixed(2)}`);

// ---------- Итог ----------
console.log(`\nВсего проверок: ${passed + failed}`);
console.log(`Успешно: ${passed}`);
console.log(`Провалено: ${failed}`);
console.log(failed === 0 ? '\nВСЕ ПРОВЕРКИ ПРОШЛИ' : '\nЕСТЬ ОШИБКИ');

process.exit(failed === 0 ? 0 : 1);
