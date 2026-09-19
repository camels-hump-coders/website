import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../biobuzz-complex-data.js';
import { DIFFICULTIES, createRun, evaluateMedals, challengeText } from '../biobuzz-complex-challenges.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/* A separate grid flood-fill verifies that even closed gates leave a route to
 * every flower and hive; it does not rely on the generator's placement logic. */
function unreachableFeatures(level) {
    const step = 30;
    const columns = Math.floor((level.width - 50) / step) + 1;
    const rows = Math.floor((level.height - 50) / step) + 1;
    const point = id => ({ x: 25 + (id % columns) * step, y: 25 + Math.floor(id / columns) * step });
    const cell = position => Math.round((position.x - 25) / step) + Math.round((position.y - 25) / step) * columns;
    const obstacles = [...level.obstacles, ...level.zones.filter(zone => zone.type === 'gate')];
    const walkable = Array.from({ length: columns * rows }, (_, index) => obstacles.every(obstacle => distance(point(index), obstacle) >= obstacle.r + 18));
    const visited = new Set([cell(level.hive)]);
    const queue = [...visited];
    for (let cursor = 0; cursor < queue.length; cursor++) {
        const index = queue[cursor], x = index % columns, y = Math.floor(index / columns);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            if (x + dx < 0 || x + dx >= columns || y + dy < 0 || y + dy >= rows) continue;
            const next = index + dx + dy * columns;
            if (walkable[next] && !visited.has(next)) { visited.add(next); queue.push(next); }
        }
    }
    return [...level.flowers, ...level.hives].filter(feature => !visited.has(cell(feature)));
}

test('runs are reproducible, preserve authored maps and retain custom timer ratios', () => {
    const originals = structuredClone(LEVELS);
    for (const base of LEVELS) {
        const run = createRun(base, { seed: 0 });
        assert.deepEqual(run, createRun(base, { seed: 0 }));
        assert.notDeepEqual(run.flowers, createRun(base, { seed: 1 }).flowers);
        assert.equal(run.seed, 0);
        assert.equal(run.time, [110, 140, 160, 175, 200][base.id]);
        const halfTime = createRun({ ...base, time: base.time / 2 }, { seed: 0 });
        assert.equal(halfTime.time, run.time / 2);
        assert.equal(createRun({ ...base, time: 0 }, { seed: 0 }).time, 0);
        for (const invalid of [undefined, NaN, Infinity]) assert.ok(Number.isFinite(createRun({ ...base, time: invalid }, { seed: 0 }).time));
    }
    assert.deepEqual(LEVELS, originals);
    assert.equal(createRun(LEVELS[0], { difficulty: 'unknown', seed: -1 }).difficulty, 'normal');
    assert.equal(createRun(LEVELS[0], { seed: -1 }).seed, 4294967295);
});

for (const base of LEVELS) test(`${base.name}: generated objectives remain accessible across difficulties and seeds`, () => {
    for (const difficulty of Object.keys(DIFFICULTIES)) for (let seed = 0; seed < 20; seed++) {
        const run = createRun(base, { difficulty, seed });
        const context = `${base.name}, ${difficulty}, seed ${seed}`;
        const expectedHives = [1, 1, 2, 2, 3][base.id];
        const addedHazards = base.id === 0 ? 0 : difficulty === 'hard' ? 1 : difficulty === 'expert' ? 2 : 0;
        assert.equal(run.hives.length, expectedHives, context);
        assert.ok(run.hazards.length >= [2, 4, 7, 10, 13][base.id] + addedHazards, context);
        assert.equal(run.patches.length, base.patches.length);
        assert.equal(run.target, base.target);
        assert.equal(run.missions.cleanRequired, 0, 'Clean streaks are optional');
        assert.ok(run.flowers.filter(flower => flower.behavior === 'hidden').length >= run.missions.hiddenRequired);
        for (const species of new Set(run.sequences.flat())) {
            assert.ok(run.flowers.filter(flower => flower.type === species && flower.behavior === 'normal').length >= 2, `${context}: ${species} has two ordinary sources`);
        }
        for (const [index, flower] of run.flowers.entries()) {
            assert.ok(flower.x >= 24 && flower.y >= 24 && flower.x <= run.width - 24 && flower.y <= run.height - 24, context);
            assert.ok(run.obstacles.every(obstacle => distance(obstacle, flower) >= obstacle.r + 39 + (flower.moveRange || 0)), `${context}: flower inside obstacle`);
            assert.ok(run.hives.every(hive => distance(hive, flower) >= 90), context);
            assert.ok(run.flowers.slice(index + 1).every(other => distance(other, flower) >= 90), context);
        }
        for (const hive of run.hives) {
            assert.ok(run.obstacles.every(obstacle => distance(obstacle, hive) >= obstacle.r + 80), context);
            assert.ok(run.hazards.every(hazard => distance(hazard, hive) >= hazard.r + 140), `${context}: hive lacks a safe approach`);
        }
        assert.deepEqual(unreachableFeatures(run), [], context);
        if (base.id >= 2) assert.ok(run.obstacles.length >= base.obstacles.length + 4, context);
        if (base.id === 0) {
            for (let i = 0; i < 2; i++) assert.deepEqual({ x: run.flowers[i].x, y: run.flowers[i].y }, { x: base.flowers[i].x, y: base.flowers[i].y });
        }
    }
});

test('difficulty changes budgets and challenge length; every added pair has matching species', () => {
    for (const base of LEVELS) {
        for (const [difficulty, rules] of Object.entries(DIFFICULTIES)) {
            const run = createRun(base, { difficulty, seed: 42 });
            assert.equal(run.rules, rules);
            assert.equal(run.time, [110, 140, 160, 175, 200][base.id] * rules.timeFactor);
            const addedPairs = difficulty === 'expert' ? 2 : difficulty === 'hard' ? 1 : 0;
            assert.equal(run.sequences.flat().length, base.sequences.flat().length + addedPairs * 2);
            for (const sequence of run.sequences) for (let i = 0; i < sequence.length; i += 2) assert.equal(sequence[i], sequence[i + 1]);
            assert.equal(run.missions.deadline, Math.round([0, 60, 75, 85, 100][base.id] * rules.timeFactor));
        }
    }
});

test('bonus missions vary by seed and are feasible within the generated flower selection', () => {
    for (const base of LEVELS) {
        const bonusTypes = new Set();
        for (let seed = 0; seed < 35; seed++) {
            const run = createRun(base, { seed });
            const mission = run.missions;
            bonusTypes.add(mission.bonusType);
            if (mission.bonusType === 'rare') assert.ok(run.flowers.filter(flower => flower.behavior === 'rare').length >= mission.bonusTarget);
            if (mission.bonusType === 'variety') assert.ok(new Set(run.flowers.map(flower => flower.type)).size >= mission.bonusTarget);
            if (mission.bonusType === 'clean') assert.ok(mission.bonusTarget <= run.flowers.length);
            assert.ok(challengeText(run)[0].includes(String(mission.bonusTarget)));
            assert.ok(challengeText(run).every(text => !text.includes('undefined')));
        }
        assert.deepEqual([...bonusTypes].sort(), ['clean', 'rare', 'variety']);
    }
    assert.ok(challengeText(LEVELS[0]).every(text => !text.includes('undefined')));
});

test('explicit zero settings in custom hazards remain zero', () => {
    const fixture = { ...LEVELS[0], hazards: [
        { type: 'bird', x: 1200, y: 200, r: 24, speed: 0, range: 0, phase: 0 },
        { type: 'spider', x: 1200, y: 720, r: 24, speed: 0, range: 0, phase: 0 },
    ] };
    const run = createRun(fixture, { seed: 7 });
    for (const hazard of run.hazards) {
        assert.equal(hazard.speed, 0);
        assert.equal(hazard.range, 0);
        assert.equal(hazard.phase, 0);
    }
});

test('medals require a win and apply exact independent performance criteria', () => {
    const level = { time: 100, target: 10 };
    const baseline = { mode: 'won', time: 29, delivered: 10, damageTaken: 2, minEnergy: 9, maxCombo: 3, bonusComplete: false };
    const medal = changes => evaluateMedals({ level, state: { ...baseline, ...changes } });
    assert.deepEqual(medal({}), ['bronze']);
    assert.deepEqual(medal({ mode: 'lost', time: 100, delivered: 99, damageTaken: 0, minEnergy: 100, maxCombo: 20, bonusComplete: true }), []);
    assert.deepEqual(medal({ time: 30 }), ['bronze', 'silver']);
    assert.deepEqual(medal({ delivered: 14 }), ['bronze', 'silver']);
    assert.deepEqual(medal({ damageTaken: 1, minEnergy: 10, maxCombo: 4 }), ['bronze', 'gold']);
    assert.deepEqual(medal({ damageTaken: 0, maxCombo: 5, bonusComplete: true }), ['bronze', 'master']);
    assert.deepEqual(medal({ time: 30, damageTaken: 0, minEnergy: 10, maxCombo: 5, bonusComplete: true }), ['bronze', 'silver', 'gold', 'master']);
});
