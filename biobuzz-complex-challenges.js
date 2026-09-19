import { LEVELS, FLOWERS } from './biobuzz-complex-data.js';

/** Rules are immutable; a run owns its geometry and never edits the authored maps. */
export const DIFFICULTIES = Object.freeze({
    easy: Object.freeze({ id: 'easy', label: 'Easy', description: 'Room to explore, a larger energy reserve, and gentler hazards.', hazardSpeed: 0.75, timeFactor: 1.35, maxEnergy: 140, energyDrain: 0.65, abilityCost: 10, comboWindow: 16, health: 6, grace: 2.8 }),
    normal: Object.freeze({ id: 'normal', label: 'Normal', description: 'Plan a route, manage your energy, and keep your flower combo alive.', hazardSpeed: 1, timeFactor: 1, maxEnergy: 110, energyDrain: 1, abilityCost: 15, comboWindow: 12, health: 5, grace: 2 }),
    hard: Object.freeze({ id: 'hard', label: 'Hard', description: 'Faster patrols, tighter energy and time limits, and one extra pollination pair.', hazardSpeed: 1.12, timeFactor: 0.85, maxEnergy: 90, energyDrain: 1.2, abilityCost: 18, comboWindow: 10, health: 4, grace: 1.7 }),
    expert: Object.freeze({ id: 'expert', label: 'Expert', description: 'Quick hazards, short combos, and two extra pollination pairs leave little room for mistakes.', hazardSpeed: 1.25, timeFactor: 0.73, maxEnergy: 75, energyDrain: 1.35, abilityCost: 22, comboWindow: 8, health: 3, grace: 1.5 }),
});

export const MEDALS = [
    { id: 'bronze', name: 'Bronze', description: 'Complete every required habitat objective.' },
    { id: 'silver', name: 'Silver', description: 'Win with at least 30% of your time left, or deliver four extra pollen.' },
    { id: 'gold', name: 'Gold', description: 'Win with at most one hit, keep energy at 10 or above, and reach a four-flower combo.' },
    { id: 'master', name: 'Master', description: 'Win, finish the habitat bonus, take no damage, and reach a five-flower combo.' },
];

const TIMES = [110, 140, 160, 175, 200];
const HAZARD_COUNTS = [2, 4, 7, 10, 13];
const TYPED_QUOTAS = [{}, { aster: 2 }, { milkweed: 2 }, { goldenrod: 3, milkweed: 2 }, { aster: 3, milkweed: 3, monarda: 3 }];
const OUTPOST_QUOTAS = [0, 0, 2, 3, 4];
const HIDDEN_QUOTAS = [0, 0, 1, 1, 2];
const DEADLINES = [0, 60, 75, 85, 100];
const BONUS_TARGETS = [
    { rare: 1, variety: 2, clean: 4 }, { rare: 1, variety: 4, clean: 6 },
    { rare: 2, variety: 4, clean: 8 }, { rare: 2, variety: 5, clean: 8 },
    { rare: 3, variety: 6, clean: 10 },
];
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

/** Mulberry32: the same integer seed reproduces the same habitat in any browser. */
export function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) | 0;
        let value = Math.imul(state ^ (state >>> 15), 1 | state);
        value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

/** Try local variation first, then search the whole map without an unbounded loop. */
function findPosition(level, random, preferred, valid, margin = 65) {
    const width = level.width - margin * 2, height = level.height - margin * 2;
    if (width < 0 || height < 0) return null;
    for (let attempt = 0; attempt < 240; attempt++) {
        const local = preferred && attempt < 120;
        const spread = local ? 70 + Math.floor(attempt / 20) * 45 : 0;
        const point = {
            x: local ? clamp(preferred.x + (random() * 2 - 1) * spread, margin, level.width - margin) : margin + random() * width,
            y: local ? clamp(preferred.y + (random() * 2 - 1) * spread, margin, level.height - margin) : margin + random() * height,
        };
        if (valid(point)) return point;
    }
    // A deterministic fallback also handles deliberately small custom maps.
    for (let y = margin; y <= level.height - margin; y += 35) {
        for (let x = margin; x <= level.width - margin; x += 35) if (valid({ x, y })) return { x, y };
    }
    return null;
}

function addHives(level, random, index) {
    level.hives = [{ ...level.hive, id: 'home', name: 'Home hive', quota: 0 }];
    const count = index === 4 ? 2 : index >= 2 ? 1 : 0;
    for (let i = 0; i < count; i++) {
        const preferred = { x: level.width * (i ? 0.7 : 0.84), y: level.height * (i ? 0.23 : 0.8) };
        const position = findPosition(level, random, preferred, point =>
            point.x > level.width * 0.52
            && level.hives.every(hive => distance(point, hive) > 390)
            && level.obstacles.every(obstacle => distance(point, obstacle) > obstacle.r + 120)
            && level.flowers.every(flower => distance(point, flower) > 125), 105);
        if (position) level.hives.push({ ...position, id: `outpost-${i + 1}`, name: i ? 'Woodland outpost' : 'Meadow outpost', quota: OUTPOST_QUOTAS[index] });
    }
}

function varyFlowers(level, random, index) {
    const spread = index === 0 ? 20 : 45;
    const authored = level.flowers.map(flower => ({ ...flower }));
    for (let i = 0; i < level.flowers.length; i++) {
        const flower = level.flowers[i];
        flower.behavior = 'normal';
        if (index === 0 && i < 2) continue;
        for (let attempt = 0; attempt < 60; attempt++) {
            const point = { x: authored[i].x + (random() * 2 - 1) * spread, y: authored[i].y + (random() * 2 - 1) * spread };
            if (point.x < 60 || point.y < 60 || point.x > level.width - 60 || point.y > level.height - 60) continue;
            if (level.flowers.some((other, j) => i !== j && distance(point, other) < 90)) continue;
            if (level.hives.some(hive => distance(point, hive) < 120)) continue;
            if (level.obstacles.some(obstacle => distance(point, obstacle) < obstacle.r + 48)) continue;
            if (level.hazards.some(hazard => distance(point, hazard) < hazard.r + 35)) continue;
            Object.assign(flower, point);
            break;
        }
    }

    // The first two sources of EVERY species stay ordinary and available.
    // Timed blooms and moving flowers therefore never lock a required trail.
    const seen = {};
    let variant = 0;
    for (let i = 0; i < level.flowers.length; i++) {
        const flower = level.flowers[i];
        seen[flower.type] = (seen[flower.type] || 0) + 1;
        if (i < 4 || seen[flower.type] <= 2) continue;
        const variants = index === 0 ? ['timed', 'normal', 'normal'] : index === 1 ? ['timed', 'moving', 'normal'] : ['timed', 'moving', 'multi', 'normal'];
        flower.behavior = variants[variant++ % variants.length];
        if (flower.behavior === 'timed') {
            flower.period = 10 + index;
            flower.openFor = level.difficulty === 'hard' || level.difficulty === 'expert' ? 5 : 7;
            flower.phase = random() * flower.period;
        } else if (flower.behavior === 'moving') {
            const range = 16 + index * 3;
            const safe = level.flowers.every(other => other === flower || distance(flower, other) >= 90 + range + (other.moveRange || 0))
                && level.obstacles.every(obstacle => distance(flower, obstacle) >= obstacle.r + 48 + range)
                && level.hives.every(hive => distance(flower, hive) >= 120 + range);
            if (safe) { flower.moveRange = range; flower.phase = random() * Math.PI * 2; }
            else flower.behavior = 'normal';
        } else if (flower.behavior === 'multi') flower.visitsRequired = index === 4 ? 3 : 2;
    }
}

function addBonusFlowers(level, random, index) {
    const species = [...new Set(level.flowers.map(flower => flower.type))];
    if (!species.length) return;
    const rareCount = index >= 4 ? 3 : index >= 2 ? 2 : 1;
    const hiddenCount = index >= 4 ? 3 : index >= 2 ? 2 : 1;
    for (const [behavior, count] of [['rare', rareCount], ['hidden', hiddenCount]]) {
        for (let i = 0; i < count; i++) {
            const preferred = { x: level.width * (0.5 + random() * 0.4), y: level.height * (0.2 + random() * 0.65) };
            const point = findPosition(level, random, preferred, position =>
                level.flowers.every(flower => distance(position, flower) >= 120 + (flower.moveRange || 0))
                && level.hives.every(hive => distance(position, hive) >= 165)
                && level.obstacles.every(obstacle => distance(position, obstacle) >= obstacle.r + 65)
                && level.hazards.every(hazard => distance(position, hazard) >= hazard.r + 55), 85);
            if (point) level.flowers.push({ ...point, type: species[(i + index) % species.length], behavior, phase: random() * Math.PI * 2 });
        }
    }
}

function addCorridors(level, random, index) {
    if (index < 2) return;
    const originalCount = level.obstacles.length;
    const center = { x: level.width * 0.54, y: level.height * 0.53 };
    const count = index === 4 ? 5 : index === 3 ? 4 : 3;
    const radius = index === 2 ? 36 : 32;
    const alongX = index === 3;
    for (let step = 0; step < count; step++) for (const side of [-1, 1]) {
        const offset = (step - (count - 1) / 2) * 105;
        const proposed = {
            x: center.x + (alongX ? offset : side * 105) + (random() - 0.5) * 22,
            y: center.y + (alongX ? side * 105 : offset) + (random() - 0.5) * 22,
        };
        if (proposed.x < 85 || proposed.y < 85 || proposed.x > level.width - 85 || proposed.y > level.height - 85) continue;
        if (level.flowers.some(flower => distance(proposed, flower) < radius + 62 + (flower.moveRange || 0))) continue;
        if (level.hives.some(hive => distance(proposed, hive) < radius + 170)) continue;
        if (level.obstacles.some(obstacle => distance(proposed, obstacle) < radius + obstacle.r + 24)) continue;
        level.obstacles.push({ ...proposed, r: radius, type: index === 2 ? 'tree' : 'rock' });
    }
    // Flower clusters can rule out most of the preferred corridor. Place a
    // short alternative pair so every generated habitat still has passages.
    for (let attempt = 0; level.obstacles.length - originalCount < 4 && attempt < 3; attempt++) {
        const pair = centerPoint => [-1, 1].map(side => ({
            x: centerPoint.x + (alongX ? 0 : side * 100),
            y: centerPoint.y + (alongX ? side * 100 : 0),
        }));
        const position = findPosition(level, random, center, centerPoint => pair(centerPoint).every(point =>
            level.flowers.every(flower => distance(point, flower) >= radius + 62 + (flower.moveRange || 0))
            && level.hives.every(hive => distance(point, hive) >= radius + 170)
            && level.obstacles.every(obstacle => distance(point, obstacle) >= radius + obstacle.r + 24)), 180);
        if (!position) break;
        for (const point of pair(position)) level.obstacles.push({ ...point, r: radius, type: index === 2 ? 'tree' : 'rock' });
    }
}

function hazardTemplate(type, random, index, ordinal) {
    const phase = random() * Math.PI * 2;
    switch (type) {
        case 'wasp': return { type, r: 24, speed: 0.5, range: 140, detection: 230, chaseSpeed: 155, chaseDuration: 2.8, restDuration: 3.5, phase };
        case 'machine': return { type, r: 48, range: 160, speed: 0.3, axis: ordinal % 2 ? 'x' : 'y', phase };
        case 'spider': return { type, r: 34, range: 45, speed: 0.6, phase };
        case 'rain': return { type, r: 66 + index * 3, range: 55, speed: 0.3, period: 12, openFor: 7, warningTime: 2, phase };
        case 'pesticide': return { type, r: 72, range: 0, speed: 0, period: 11, openFor: 4, warningTime: 2, phase };
        default: return { type: 'bird', r: 30, speed: 0.6 + index * 0.06, range: 95 + index * 12, path: ordinal % 2 ? 'orbit' : 'cross', phase };
    }
}

function addHazards(level, random, index, canonical) {
    const additions = index === 1 ? ['wasp', 'bird', 'spider'] : index === 2 ? ['wasp', 'bird', 'rain']
        : index === 3 ? ['machine', 'wasp', 'bird', 'spider', 'rain']
            : ['machine', 'wasp', 'bird', 'spider', 'rain', 'pesticide'];
    const originalCount = level.hazards.length;
    for (let i = 0; i < originalCount; i++) {
        const hazard = level.hazards[i];
        // Only the authored, formerly stationary spiders gain a patrol. Custom
        // zero speed/range/phase settings are valid and are left untouched.
        const authoredSpider = hazard.type === 'spider' && canonical?.hazards.some(original => original.type === hazard.type && original.x === hazard.x && original.y === hazard.y && original.speed === hazard.speed && original.range === hazard.range);
        if (authoredSpider) { hazard.range = 45; hazard.speed = 0.6; }
        hazard.phase ??= random() * Math.PI * 2;
        if (hazard.type === 'bird') hazard.path ??= i % 2 ? 'orbit' : 'cross';
        if (hazard.type === 'rain' || hazard.type === 'pesticide') {
            hazard.period ??= hazard.type === 'rain' ? 12 : 11;
            hazard.openFor ??= hazard.type === 'rain' ? 7 : 4;
            hazard.warningTime ??= 2;
        }
    }
    const extra = index === 0 ? 0 : level.difficulty === 'expert' ? 2 : level.difficulty === 'hard' ? 1 : 0;
    for (let i = originalCount; i < HAZARD_COUNTS[index] + extra; i++) {
        level.hazards.push(hazardTemplate(additions[(i - originalCount) % additions.length], random, index, i));
    }
    const placed = [];
    for (let i = 0; i < level.hazards.length; i++) {
        const hazard = level.hazards[i];
        const patrol = ['bird', 'rain', 'spider', 'machine', 'wasp'].includes(hazard.type) ? (hazard.range ?? 0) : 0;
        const margin = hazard.r + patrol + 35;
        const safe = point =>
            level.hives.every(hive => distance(point, hive) > hazard.r + patrol + 140)
            && level.flowers.every(flower => distance(point, flower) > hazard.r + 35 + (flower.moveRange || 0))
            && level.obstacles.every(obstacle => distance(point, obstacle) > hazard.r + obstacle.r + 22)
            && placed.every(other => distance(point, other) > hazard.r + other.r + 55);
        const hasPosition = Number.isFinite(hazard.x) && Number.isFinite(hazard.y);
        const inBounds = hasPosition && hazard.x >= margin && hazard.y >= margin && hazard.x <= level.width - margin && hazard.y <= level.height - margin;
        if (!(inBounds && safe(hazard))) {
            const target = level.flowers[Math.min(level.flowers.length - 1, 4 + (i * 3) % Math.max(1, level.flowers.length - 4))];
            const angle = random() * Math.PI * 2;
            const radius = hazard.r + 105;
            const preferred = hasPosition ? hazard : target ? { x: target.x + Math.cos(angle) * radius, y: target.y + Math.sin(angle) * radius } : null;
            const point = findPosition(level, random, preferred, safe, margin);
            if (!point) continue;
            Object.assign(hazard, point);
        }
        placed.push(hazard);
    }
    level.hazards = placed;
}

function addZones(level, random, index) {
    level.zones = [];
    if (index === 0) return;
    const windCount = index >= 3 ? 2 : 1;
    for (let i = 0; i < windCount; i++) {
        const preferred = { x: level.width * (i ? 0.72 : 0.43), y: level.height * (i ? 0.72 : 0.47) };
        const point = findPosition(level, random, preferred, position => level.hives.every(hive => distance(position, hive) > 260), 145);
        if (point) level.zones.push({ ...point, type: 'wind', r: 125, force: 42 + index * 5, angle: random() * Math.PI * 2, period: 12, openFor: 8, phase: random() * 12 });
    }
    if (index === 2 || index === 4) {
        const hidden = level.flowers.filter(flower => flower.behavior === 'hidden');
        for (const flower of hidden.slice(0, 2)) level.zones.push({ x: flower.x, y: flower.y, type: 'dark', r: 155, force: 0, angle: 0, period: 0, openFor: 0, phase: 0 });
    }
    if (index < 2) return;
    const gateCount = index >= 3 ? 2 : 1;
    for (let i = 0; i < gateCount; i++) {
        const preferred = { x: level.width * (i ? 0.73 : 0.48), y: level.height * (i ? 0.58 : 0.43) };
        const radius = 53;
        const point = findPosition(level, random, preferred, position =>
            level.hives.every(hive => distance(position, hive) > radius + 170)
            && level.flowers.every(flower => distance(position, flower) > radius + 60 + (flower.moveRange || 0))
            && level.obstacles.every(obstacle => distance(position, obstacle) > radius + obstacle.r + 25)
            && level.zones.filter(zone => zone.type === 'gate').every(zone => distance(position, zone) > radius + zone.r + 100), 90);
        if (point) level.zones.push({ ...point, type: 'gate', r: radius, force: 0, angle: 0, period: 12, openFor: 6, warningTime: 2, phase: random() * 12 });
    }
}

/**
 * Generate a reproducible challenge without changing an authored level. A seed
 * of zero is valid. Custom time overrides retain their ratio to authored time,
 * which lets a short fixture or accessibility extension keep its intent.
 */
export function createRun(baseLevel, { difficulty = 'normal', seed = Date.now() } = {}) {
    const selected = Object.hasOwn(DIFFICULTIES, difficulty) ? difficulty : 'normal';
    const rules = DIFFICULTIES[selected];
    const index = clamp(Number.isInteger(baseLevel.id) ? baseLevel.id : 0, 0, TIMES.length - 1);
    const canonical = LEVELS.find(level => level.id === baseLevel.id);
    const level = structuredClone(baseLevel);
    level.difficulty = selected;
    level.rules = rules;
    level.seed = Number(seed) >>> 0;
    const random = seededRandom(level.seed);
    const scale = Number.isFinite(baseLevel.time) && canonical ? baseLevel.time / canonical.time : 1;
    level.time = Math.max(0, TIMES[index] * rules.timeFactor * scale);
    level.flowers ??= [];
    level.hazards ??= [];
    level.obstacles ??= [];
    level.sequences ??= [];
    level.patches ??= [];
    if ((selected === 'hard' || selected === 'expert') && level.sequences.length) {
        const last = level.sequences.at(-1);
        const species = [...new Set(level.flowers.map(flower => flower.type))].filter(type => level.flowers.filter(flower => flower.type === type).length >= 2);
        const count = selected === 'expert' ? 2 : 1;
        for (let i = 0; i < count && species.length; i++) {
            const choices = species.filter(type => type !== last.at(-1));
            const available = choices.length ? choices : species;
            const type = available[Math.floor(random() * available.length)];
            last.push(type, type);
        }
    }
    const bonusType = ['rare', 'variety', 'clean'][Math.floor(random() * 3)];
    level.missions = {
        typed: { ...TYPED_QUOTAS[index] }, hiveQuota: OUTPOST_QUOTAS[index], hiddenRequired: HIDDEN_QUOTAS[index], cleanRequired: 0,
        deadline: Math.round(DEADLINES[index] * rules.timeFactor), bonusType, bonusTarget: BONUS_TARGETS[index][bonusType],
    };
    addHives(level, random, index);
    varyFlowers(level, random, index);
    addBonusFlowers(level, random, index);
    addCorridors(level, random, index);
    addHazards(level, random, index, canonical);
    addZones(level, random, index);
    // A small custom map may not have enough room for optional generated items.
    level.missions.hiddenRequired = Math.min(level.missions.hiddenRequired, level.flowers.filter(flower => flower.behavior === 'hidden').length);
    if (level.hives.length === 1) level.missions.hiveQuota = 0;
    for (const type of Object.keys(level.missions.typed)) if (!level.flowers.some(flower => flower.type === type)) delete level.missions.typed[type];
    return level;
}

/** Medal categories are independent and award only at a successful finish. */
export function evaluateMedals(game) {
    const state = game?.state, level = game?.level;
    if (state?.mode !== 'won' || !level) return [];
    const medals = ['bronze'];
    if (state.time >= level.time * 0.3 || state.delivered >= level.target + 4) medals.push('silver');
    if (state.damageTaken <= 1 && state.minEnergy >= 10 && state.maxCombo >= 4) medals.push('gold');
    if (state.bonusComplete && state.damageTaken === 0 && state.maxCombo >= 5) medals.push('master');
    return medals;
}

/** User-facing, optional challenges. Required objectives live in missions. */
export function challengeText(level) {
    const mission = level.missions || {};
    const bonus = mission.bonusType === 'rare' ? `Collect ${mission.bonusTarget} rare ${mission.bonusTarget === 1 ? 'flower' : 'flowers'}.`
        : mission.bonusType === 'clean' ? `Collect ${mission.bonusTarget} pollen in a row without taking damage.`
            : `Collect pollen from ${mission.bonusTarget} different flower species.`;
    const entries = mission.bonusType ? [`Habitat bonus: ${bonus}${mission.deadline ? ` Finish this bonus in the first ${mission.deadline} seconds.` : ''}`] : [];
    entries.push(...MEDALS.map(medal => `${medal.name}: ${medal.description}`));
    if (Object.keys(mission.typed || {}).length) {
        entries.push(`Typed deliveries: ${Object.entries(mission.typed).map(([type, count]) => `${count} ${FLOWERS[type]?.name || type}`).join(', ')}.`);
    }
    return entries;
}
