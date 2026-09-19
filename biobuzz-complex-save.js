import { DIFFICULTIES, MEDALS, evaluateMedals } from './biobuzz-complex-challenges.js';

export const SAVE_KEY = 'chc.biobuzz.adventure.v1';
const difficultyRecords = () => Object.fromEntries(Object.keys(DIFFICULTIES).map(id => [id, {}]));
export const defaultSave = () => ({
    version: 1, completed: [], best: {}, discoveries: [], badges: [], nectar: 0, deliveries: 0,
    bestByDifficulty: difficultyRecords(), medals: difficultyRecords(),
    capacityLevel: 0, ability: 'dash', settings: { music: 0.24, sfx: 0.45, muted: false, reducedMotion: false, difficulty: 'normal' }
});
const nonnegative = value => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

/** Validate each saved field; older, unavailable, or malformed saves cannot break play. */
export function normalizeSave(raw) {
    const save = defaultSave();
    if (!raw || typeof raw !== 'object') return save;
    save.completed = [...new Set(Array.isArray(raw.completed) ? raw.completed.filter(v => Number.isInteger(v) && v >= 0 && v < 5) : [])].sort();
    for (let i = 0; i < 5; i++) save.best[i] = nonnegative(raw.best?.[i]);
    for (const difficulty of Object.keys(DIFFICULTIES)) {
        for (let level = 0; level < 5; level++) {
            const prior = raw.bestByDifficulty?.[difficulty]?.[level];
            save.bestByDifficulty[difficulty][level] = prior === undefined && difficulty === 'normal'
                ? nonnegative(raw.best?.[level]) : nonnegative(prior);
            const medals = raw.medals?.[difficulty]?.[level];
            save.medals[difficulty][level] = MEDALS.filter(medal => Array.isArray(medals) && medals.includes(medal.id)).map(medal => medal.id);
        }
    }
    for (const key of ['discoveries', 'badges']) {
        save[key] = [...new Set(Array.isArray(raw[key]) ? raw[key].filter(v => typeof v === 'string' && /^[a-z_]+$/.test(v)).slice(0, 60) : [])];
    }
    save.nectar = nonnegative(raw.nectar);
    save.deliveries = nonnegative(raw.deliveries);
    save.capacityLevel = Math.min(2, nonnegative(raw.capacityLevel));
    const unlocked = raw.ability === 'shield' ? save.completed.length >= 1 : raw.ability === 'magnet' ? save.completed.length >= 2 : true;
    save.ability = ['dash', 'shield', 'magnet'].includes(raw.ability) && unlocked ? raw.ability : 'dash';
    for (const key of ['music', 'sfx']) {
        const value = raw.settings?.[key];
        if (Number.isFinite(value)) save.settings[key] = Math.max(0, Math.min(1, value));
    }
    for (const key of ['muted', 'reducedMotion']) if (typeof raw.settings?.[key] === 'boolean') save.settings[key] = raw.settings[key];
    if (Object.hasOwn(DIFFICULTIES, raw.settings?.difficulty)) save.settings.difficulty = raw.settings.difficulty;
    return save;
}

export function highestUnlocked(save) {
    let level = 0;
    while (level < 4 && save.completed.includes(level)) level++;
    return level;
}

export function recordResult(save, game) {
    const { state: s, level } = game;
    const difficulty = Object.hasOwn(DIFFICULTIES, level.difficulty) ? level.difficulty : 'normal';
    save.best[level.id] = Math.max(save.best[level.id] || 0, s.score);
    save.bestByDifficulty ??= difficultyRecords();
    save.bestByDifficulty[difficulty] ??= {};
    save.bestByDifficulty[difficulty][level.id] = Math.max(save.bestByDifficulty[difficulty][level.id] || 0, s.score);
    if (s.mode !== 'won') return 0;
    save.medals ??= difficultyRecords();
    save.medals[difficulty] ??= {};
    const earned = new Set([...(save.medals[difficulty][level.id] || []), ...evaluateMedals(game)]);
    save.medals[difficulty][level.id] = MEDALS.filter(medal => earned.has(medal.id)).map(medal => medal.id);
    const first = !save.completed.includes(level.id);
    if (first) save.completed.push(level.id);
    const reward = first ? 10 + s.health : 3;
    save.nectar += reward;
    return reward;
}
