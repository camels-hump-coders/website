import test from 'node:test';
import assert from 'node:assert/strict';
import { BioBuzzGame } from '../biobuzz-complex-core.js';
import { LEVELS, ABILITIES } from '../biobuzz-complex-data.js';
import { defaultSave, normalizeSave, highestUnlocked, recordResult } from '../biobuzz-complex-save.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const advance = (game, seconds, input = {}) => {
    for (let elapsed = 0; elapsed < seconds; elapsed += 0.05) game.update(Math.min(0.05, seconds - elapsed), input);
};
const touch = (game, position) => {
    Object.assign(game.state.bee, position, { vx: 0, vy: 0 });
    game.update(0.01);
};
const scenario = (overrides = {}, options = {}) => {
    const events = [];
    const level = {
        ...LEVELS[0], target: 99, obstacles: [], hazards: [],
        flowers: [{ x: 500, y: 450, type: 'clover' }, { x: 650, y: 450, type: 'clover' }, { x: 800, y: 450, type: 'aster' }],
        ...overrides,
    };
    const game = new BioBuzzGame(level, { reducedMotion: true, onEvent: (name, detail) => events.push({ name, ...detail }), ...options });
    return { game, events };
};

test('pollination requires ordered species and two distinct flowers; cooldown permits later harvests', () => {
    const { game, events } = scenario();
    const [first, second, other] = game.world.flowers;
    touch(game, other);
    assert.equal(game.state.sequenceIndex, 0, 'An unrelated flower cannot start the trail');
    touch(game, first);
    assert.equal(game.state.sequenceIndex, 1);
    touch(game, first);
    assert.equal(game.state.collected, 2, 'A flower cannot be harvested twice immediately');
    advance(game, 7.1);
    assert.equal(game.state.collected, 3, 'Flowers replenish after waiting');
    assert.equal(game.state.sequenceIndex, 1, 'Reharvesting the same flower cannot cross-pollinate itself');
    touch(game, second);
    assert.equal(game.state.challengeIndex, 1);
    assert.equal(game.state.restored, 1);
    assert.equal(game.world.patches[0].restored, true);
    assert.equal(events.filter(event => event.name === 'pollinate').length, 1);
});

test('full baskets require delivery, preserve flower pollen, and a delivery heals by only one', () => {
    const { game, events } = scenario({}, { capacity: 1 });
    touch(game, game.world.flowers[0]);
    touch(game, game.world.flowers[1]);
    assert.equal(game.state.carried, 1);
    assert.equal(game.world.flowers[1].ready, true);
    assert.equal(game.state.sequenceIndex, 1);
    game.state.health = 2;
    touch(game, game.world.hive);
    assert.equal(game.state.carried, 0);
    assert.equal(game.state.delivered, 1);
    assert.equal(game.state.health, 3);
    const score = game.state.score;
    touch(game, game.world.hive);
    assert.equal(game.state.score, score, 'An empty return cannot create points or healing');
    assert.equal(game.state.health, 3);
    touch(game, game.world.flowers[1]);
    assert.equal(game.state.challengeIndex, 1, 'A hive return does not discard trail progress');
    assert.ok(events.some(event => event.name === 'hint'));
});

test('winning requires both delivery and restoration goals', () => {
    const deliveryFirst = scenario({ target: 1 }).game;
    touch(deliveryFirst, deliveryFirst.world.flowers[0]);
    touch(deliveryFirst, deliveryFirst.world.hive);
    assert.equal(deliveryFirst.state.mode, 'playing', 'Delivery alone must not win');
    touch(deliveryFirst, deliveryFirst.world.flowers[1]);
    assert.equal(deliveryFirst.state.mode, 'won');

    const restorationFirst = scenario({ target: 2 }).game;
    touch(restorationFirst, restorationFirst.world.flowers[0]);
    touch(restorationFirst, restorationFirst.world.flowers[1]);
    assert.equal(restorationFirst.state.mode, 'playing', 'Restoring the patch alone must not win');
    touch(restorationFirst, restorationFirst.world.hive);
    assert.equal(restorationFirst.state.mode, 'won');
    const finalScore = restorationFirst.state.score;
    advance(restorationFirst, 5, { x: 1 });
    assert.equal(restorationFirst.state.score, finalScore, 'A finished game cannot award a second completion bonus');
});

test('pause freezes simulation; time and health losses each emit one terminal event', () => {
    const paused = scenario().game;
    paused.state.mode = 'paused';
    const original = structuredClone(paused.state);
    advance(paused, 5, { x: 1 });
    assert.deepEqual(paused.state, original);
    assert.equal(paused.activateAbility(), false);

    const timed = scenario({ time: 0.02 });
    timed.game.update(0.05);
    assert.equal(timed.game.state.mode, 'lost');
    assert.equal(timed.events.find(event => event.name === 'finish').reason, 'time');
    advance(timed.game, 5);
    assert.equal(timed.events.filter(event => event.name === 'finish').length, 1);

    const injured = scenario({ hazards: [{ x: 305, y: 450, r: 60, type: 'spider' }] });
    injured.game.state.health = 1;
    injured.game.update(0.01);
    assert.equal(injured.game.state.mode, 'lost');
    assert.equal(injured.events.find(event => event.name === 'finish').reason, 'health');
});

test('hazard contact has a damage cooldown and inactive pesticide is safe', () => {
    const { game } = scenario({ hazards: [{ x: 305, y: 450, r: 70, type: 'spider' }] });
    game.update(0.01);
    assert.equal(game.state.health, 4);
    touch(game, { x: 305, y: 450 });
    assert.equal(game.state.health, 4);
    touch(game, { x: 1100, y: 600 });
    advance(game, 2.5);
    touch(game, { x: 305, y: 450 });
    assert.equal(game.state.health, 3);

    const spray = scenario({ hazards: [{ x: 305, y: 450, r: 70, type: 'pesticide', phase: 0 }] }).game;
    spray.update(0.01);
    assert.equal(spray.state.health, 5);
    assert.equal(spray.world.hazards[0].active, false);
    touch(spray, { x: 1100, y: 600 });
    advance(spray, 4.1);
    touch(spray, { x: 305, y: 450 });
    assert.equal(spray.state.health, 4);
});

test('explicit zero hazard phase, speed, and range are preserved', () => {
    const { game } = scenario({ hazards: [
        { x: 1050, y: 300, r: 30, type: 'bird', speed: 0.8, range: 0, phase: 0 },
        { x: 1050, y: 700, r: 40, type: 'rain', speed: 0, range: 70, phase: 0 },
        { x: 1100, y: 450, r: 30, type: 'bird', speed: 0, range: 90, phase: 0 },
        { x: 1200, y: 150, r: 40, type: 'rain', speed: 0.8, range: 0, phase: 0 },
    ] });
    assert.ok(game.world.hazards.every(hazard => hazard.phase === 0), 'Phase zero must not become the array index');
    game.update(0.01);
    const positions = game.world.hazards.map(({ x, y }) => ({ x, y }));
    advance(game, 5);
    assert.deepEqual(game.world.hazards.map(({ x, y }) => ({ x, y })), positions, 'Zero speed or range produces a stationary hazard');
    assert.deepEqual(positions[0], { x: 1050, y: 300 });
    assert.deepEqual(positions[3], { x: 1200, y: 150 });
});

test('abilities apply their effect, reject repeated activation, and recharge', () => {
    const dash = scenario({}, { ability: 'dash' }).game;
    const normal = scenario().game;
    assert.equal(dash.activateAbility(), true);
    assert.equal(dash.activateAbility(), false);
    advance(dash, 0.4, { x: 1 });
    advance(normal, 0.4, { x: 1 });
    assert.ok(dash.state.bee.x > normal.state.bee.x + 50);
    advance(dash, ABILITIES.find(ability => ability.id === 'dash').cooldown);
    assert.equal(dash.activateAbility(), true);

    const shield = scenario({ hazards: [{ x: 305, y: 450, r: 60, type: 'spider' }] }, { ability: 'shield' }).game;
    shield.activateAbility();
    shield.update(0.01);
    assert.equal(shield.state.health, 5);
    touch(shield, { x: 1100, y: 600 });
    advance(shield, 3.1);
    touch(shield, { x: 305, y: 450 });
    assert.equal(shield.state.health, 4, 'Protection expires');

    const magnet = scenario({}, { ability: 'magnet' }).game;
    touch(magnet, { x: 405, y: 450 });
    assert.equal(magnet.state.carried, 0);
    magnet.activateAbility();
    magnet.update(0.01);
    assert.equal(magnet.state.carried, 1, 'Pollen breeze reaches a flower beyond normal contact range');
});

test('movement respects world edges, collision circles, and normalized diagonal speed', () => {
    const edge = scenario().game;
    advance(edge, 10, { x: -1, y: -1 });
    assert.ok(edge.state.bee.x >= 24 && edge.state.bee.y >= 24);
    advance(edge, 15, { x: 1, y: 1 });
    assert.ok(edge.state.bee.x <= edge.world.width - 24 && edge.state.bee.y <= edge.world.height - 24);

    const tree = { x: 500, y: 450, r: 65, type: 'tree' };
    const blocked = scenario({ obstacles: [tree], flowers: [] }).game;
    advance(blocked, 2, { x: 1 });
    assert.ok(distance(blocked.state.bee, tree) >= tree.r + 16.99);
    assert.ok(blocked.state.bee.x < tree.x, 'Flying directly at a tree cannot pass through it');

    const diagonal = scenario({ flowers: [] }).game;
    const straight = scenario({ flowers: [] }).game;
    const origin = { ...straight.state.bee };
    advance(diagonal, 1, { x: 1, y: 1 });
    advance(straight, 1, { x: 1, y: 0 });
    assert.ok(Math.abs(distance(origin, diagonal.state.bee) - distance(origin, straight.state.bee)) < 0.01);
});

test('saved progress roundtrips, rejects corrupt values, preserves best scores and gates unlocks', () => {
    const original = defaultSave();
    original.completed = [0, 1];
    original.ability = 'magnet';
    original.best = { 0: 800, 1: 1400 };
    original.nectar = 21;
    original.discoveries = ['clover', 'aster'];
    original.badges = ['first_delivery'];
    const restored = normalizeSave(JSON.parse(JSON.stringify(original)));
    assert.equal(restored.ability, 'magnet');
    assert.equal(restored.best[1], 1400);
    assert.equal(restored.nectar, 21);
    assert.deepEqual(restored.discoveries, original.discoveries);
    assert.equal(highestUnlocked(restored), 2);
    assert.equal(highestUnlocked(normalizeSave({ completed: [3] })), 0, 'A missing preceding level keeps later areas locked');
    assert.equal(normalizeSave({ ability: 'shield' }).ability, 'dash');
    assert.equal(normalizeSave({ completed: [0], ability: 'shield' }).ability, 'shield');
    assert.equal(normalizeSave({ completed: [0], ability: 'magnet' }).ability, 'dash');

    for (const raw of [null, false, 'broken', 42]) assert.deepEqual(normalizeSave(raw), defaultSave());
    const corrupt = normalizeSave({
        completed: [0, 0, -1, 99, '1', 1.5], best: { 0: Infinity, 1: -50, 2: '200' },
        discoveries: ['clover', 'clover', '<script>', 8], badges: null, nectar: -1, deliveries: NaN,
        capacityLevel: 900, ability: 'anything', settings: { music: 9, sfx: -3, muted: 'yes', reducedMotion: true },
    });
    assert.deepEqual(corrupt.completed, [0]);
    assert.deepEqual(corrupt.discoveries, ['clover']);
    assert.equal(corrupt.nectar, 0);
    assert.equal(corrupt.capacityLevel, 2);
    assert.equal(corrupt.best[0], 0);
    assert.equal(corrupt.best[2], 0);
    assert.deepEqual(corrupt.settings, { music: 1, sfx: 0, muted: false, reducedMotion: true });

    const save = defaultSave();
    const result = { level: { id: 0 }, state: { mode: 'won', score: 1000, health: 4 } };
    assert.equal(recordResult(save, result), 14);
    assert.equal(highestUnlocked(save), 1);
    result.state.score = 500;
    assert.equal(recordResult(save, result), 3);
    assert.equal(save.best[0], 1000);
    assert.deepEqual(save.completed, [0]);
    result.level.id = 1;
    result.state.mode = 'lost';
    assert.equal(recordResult(save, result), 0);
    assert.equal(highestUnlocked(save), 1);
});

/*
 * A grid navigator for integration tests. It sends ordinary directional input
 * through update(), never teleports the bee or alters health, pollen, or time.
 * Obstacles block cells; potential hazard patrol areas add route cost. This
 * tests real travel distances, harvesting, carrying limits and time budgets.
 */
const GRID = 45;
function navigate(game, target) {
    const { width, height, obstacles, hazards } = game.world;
    const columns = Math.floor((width - 50) / GRID) + 1;
    const rows = Math.floor((height - 50) / GRID) + 1;
    const point = index => ({ x: 25 + (index % columns) * GRID, y: 25 + Math.floor(index / columns) * GRID });
    const cell = position => Math.max(0, Math.min(columns - 1, Math.round((position.x - 25) / GRID)))
        + Math.max(0, Math.min(rows - 1, Math.round((position.y - 25) / GRID))) * columns;
    const source = cell(game.state.bee), destination = cell(target);
    const open = new Set([source]);
    const cost = new Map([[source, 0]]), priority = new Map([[source, 0]]), previous = new Map();
    const isBlocked = p => obstacles.some(obstacle => distance(p, obstacle) < obstacle.r + 42);
    const risk = p => hazards.reduce((sum, hazard) => {
        const patrol = hazard.type === 'bird' ? (hazard.range || 130) : hazard.type === 'rain' ? (hazard.range || 70) : 0;
        return sum + (distance(p, { x: hazard.originX, y: hazard.originY }) < hazard.r + patrol + 36 ? 3 : 0);
    }, 0);
    while (open.size) {
        let current = -1, minimum = Infinity;
        for (const index of open) if (priority.get(index) < minimum) { minimum = priority.get(index); current = index; }
        if (current === destination) {
            const path = [target];
            while (current !== source) { path.unshift(point(current)); current = previous.get(current); }
            return path;
        }
        open.delete(current);
        const x = current % columns, y = Math.floor(current / columns);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if ((!dx && !dy) || x + dx < 0 || x + dx >= columns || y + dy < 0 || y + dy >= rows) continue;
            const next = x + dx + (y + dy) * columns;
            const nextPoint = point(next);
            if (next !== destination && isBlocked(nextPoint)) continue;
            if (dx && dy && (isBlocked(point(x + dx + y * columns)) || isBlocked(point(x + (y + dy) * columns)))) continue;
            const proposed = cost.get(current) + Math.hypot(dx, dy) * (1 + risk(nextPoint));
            if (proposed >= (cost.get(next) ?? Infinity)) continue;
            cost.set(next, proposed);
            priority.set(next, proposed + distance(nextPoint, point(destination)) / GRID);
            previous.set(next, current);
            open.add(next);
        }
    }
    throw new Error(`No route to ${target.x},${target.y} in ${game.level.name}`);
}

function fly(game, target) {
    const path = navigate(game, target);
    for (const waypoint of path) {
        for (let step = 0; distance(game.state.bee, waypoint) > 16; step++) {
            assert.ok(step < 150, `Navigator stuck in ${game.level.name} at ${Math.round(game.state.bee.x)},${Math.round(game.state.bee.y)}`);
            if (game.state.mode !== 'playing') return;
            const dx = waypoint.x - game.state.bee.x, dy = waypoint.y - game.state.bee.y;
            const magnitude = Math.hypot(dx, dy);
            game.update(0.05, { x: dx / magnitude, y: dy / magnitude });
        }
    }
}

for (const level of LEVELS) test(`a real flight can complete ${level.name} with starting baskets and no special ability`, t => {
    const events = [];
    const game = new BioBuzzGame(level, { reducedMotion: true, onEvent: (name, detail) => events.push({ name, ...detail }) });
    let trips = 0;
    while (game.state.mode === 'playing' && trips++ < 120) {
        const state = game.state;
        if (state.carried >= state.capacity || (state.delivered + state.carried >= state.target && state.challengeIndex >= level.sequences.length)) {
            fly(game, game.world.hive);
            continue;
        }
        const expected = state.sequence[state.sequenceIndex];
        let candidates = game.world.flowers.filter(flower => flower.ready && (!expected || flower.type === expected) && flower.id !== state.lastSequenceFlower);
        if (!candidates.length) candidates = game.world.flowers.filter(flower => (!expected || flower.type === expected) && flower.id !== state.lastSequenceFlower);
        assert.ok(candidates.length, `No valid next flower for ${expected}`);
        candidates.sort((a, b) => distance(state.bee, a) - distance(state.bee, b));
        const next = candidates[0];
        fly(game, next);
        // If arrival precedes regeneration, hovering is an ordinary valid input.
        if (game.state.mode === 'playing' && next.cooldown > 0 && state.carried < state.capacity) advance(game, 0.1);
    }
    assert.equal(game.state.mode, 'won', `${level.name}: mode=${game.state.mode}, time=${game.state.time.toFixed(1)}, delivered=${game.state.delivered}, trails=${game.state.challengeIndex}, health=${game.state.health}`);
    assert.ok(game.state.delivered >= level.target);
    assert.equal(game.state.challengeIndex, level.sequences.length);
    assert.equal(game.state.restored, level.patches.length);
    assert.equal(events.filter(event => event.name === 'finish' && event.won).length, 1);
    assert.ok(game.state.time > level.time / 3, 'The route leaves generous time for a human player');
    t.diagnostic(`${(level.time - game.state.time).toFixed(1)}s flight; ${game.state.time.toFixed(1)}s remaining; ${game.state.delivered} pollen delivered; ${game.state.damageTaken} damage taken.`);
});
