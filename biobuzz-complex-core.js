import { ABILITIES } from './biobuzz-complex-data.js';
import { createRun, DIFFICULTIES } from './biobuzz-complex-challenges.js';

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const cycle = (time, period) => ((time % period) + period) % period;

/** Browser-independent simulation. The same seed and inputs reproduce a flight. */
export class BioBuzzGame {
    constructor(baseLevel, { ability = 'dash', capacity = 6, reducedMotion = false, difficulty = 'normal', seed = Date.now(), generate = true, onEvent = () => {} } = {}) {
        // Authored/custom fixtures can opt out of generation without bypassing simulation.
        const level = generate ? createRun(baseLevel, { difficulty, seed }) : structuredClone(baseLevel);
        level.rules ??= DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
        level.difficulty ??= level.rules.id;
        level.seed ??= seed;
        level.missions ??= { typed: {}, hiddenRequired: 0, deadline: 0, bonusType: 'rare', bonusTarget: 1 };
        this.level = level;
        this.emit = onEvent;
        this.world = {
            ...level,
            hives: (level.hives || [{ ...level.hive, id: 'home', name: 'Home hive', quota: 0 }]).map(h => ({ ...h })),
            flowers: level.flowers.map((f, id) => ({ ...f, id, originX: f.x, originY: f.y, ready: true, open: true, revealed: f.behavior !== 'hidden', cooldown: 0, pollinated: false, visits: 0, visitsRequired: f.visitsRequired || 1, rare: f.behavior === 'rare', found: false })),
            hazards: level.hazards.map((h, id) => ({ ...h, id, originX: h.x, originY: h.y, phase: h.phase ?? id, active: true, behaviorState: 'patrol', timer: 0 })),
            obstacles: level.obstacles.map(o => ({ ...o })),
            patches: level.patches.map(p => ({ ...p, restored: false })),
            zones: (level.zones || []).map(z => ({ ...z, active: z.type === 'dark', warning: false }))
        };
        const health = level.rules.health;
        this.state = {
            mode: 'playing', bee: { x: level.hive.x + 105, y: level.hive.y, vx: 0, vy: 0, angle: 0, invulnerable: 0, abilityTime: 0 },
            camera: { x: 0, y: 0 }, time: level.time, elapsed: 0, score: 0, health, maxHealth: health,
            carried: 0, capacity, delivered: 0, target: level.target, collected: 0, damageTaken: 0,
            ability, cooldown: 0, sequence: [...(level.sequences[0] || [])], sequenceIndex: 0, challengeIndex: 0,
            particles: [], reducedMotion, restored: 0, lastSequenceFlower: null,
            energy: level.rules.maxEnergy, maxEnergy: level.rules.maxEnergy, minEnergy: level.rules.maxEnergy,
            combo: 0, comboTimer: 0, multiplier: 1, maxCombo: 0, lastComboFlower: null,
            inventory: {}, deliveredTypes: {}, hiveDeliveries: {}, hiddenFound: 0, rareCollected: 0,
            cleanStreak: 0, maxCleanStreak: 0, bonusComplete: false, bonusProgress: 0, bonusFailed: false,
            conditions: { rain: false, wind: false, dark: false, blocked: false }
        };
        this.encounters = new Set();
        this.collectedSpecies = new Set();
        this.rareFlowers = new Set();
        this.contactHint = 0;
        this.exhaustionNotified = false;
    }

    activateAbility() {
        const s = this.state, cost = this.level.rules.abilityCost;
        if (s.mode !== 'playing' || s.cooldown > 0) return false;
        if (s.energy < cost) {
            this.emit('hint', { text: `Your ability needs ${cost} energy. Sip nectar from a flower or rest at a hive.` });
            return false;
        }
        const ability = ABILITIES.find(a => a.id === s.ability) || ABILITIES[0];
        s.energy -= cost;
        s.minEnergy = Math.min(s.minEnergy, s.energy);
        s.bee.abilityTime = ability.duration;
        s.cooldown = ability.cooldown;
        this.emit('ability', { id: ability.id, name: ability.name });
        this.burst(s.bee.x, s.bee.y, '#fff3a6', 12);
        return true;
    }

    update(dt, input = {}) {
        const s = this.state;
        if (s.mode !== 'playing') return;
        dt = clamp(dt, 0, 0.05);
        s.elapsed += dt;
        s.time = Math.max(0, s.time - dt);
        s.cooldown = Math.max(0, s.cooldown - dt);
        s.bee.invulnerable = Math.max(0, s.bee.invulnerable - dt);
        s.bee.abilityTime = Math.max(0, s.bee.abilityTime - dt);
        s.comboTimer = Math.max(0, s.comboTimer - dt);
        if (!s.comboTimer) { s.combo = 0; s.multiplier = 1; s.lastComboFlower = null; }
        this.contactHint = Math.max(0, this.contactHint - dt);
        this.updateEnvironment();
        this.moveBee(dt, input);
        this.updateHazards(dt);
        if (s.mode !== 'playing') return;
        this.updateFlowers(dt);
        this.deliver();
        this.updateBonus();
        this.updateParticles(dt);
        for (const h of this.world.hazards) {
            if (distance(s.bee, h) < h.r + 160 && !this.encounters.has(h.type)) {
                this.encounters.add(h.type);
                this.emit('discover', { id: h.type });
            }
        }
        if (this.objectivesComplete()) this.finish(true);
        else if (s.time <= 0) this.finish(false, 'time');
    }

    updateEnvironment() {
        const s = this.state;
        s.conditions = { rain: false, wind: false, dark: false, blocked: false };
        for (const z of this.world.zones) {
            const phase = cycle(s.elapsed + (z.phase || 0), z.period || 12);
            z.active = z.type === 'dark' || (z.type === 'gate' ? phase >= z.openFor : phase < z.openFor);
            z.warning = z.type === 'gate' && !z.active && phase >= z.openFor - (z.warningTime || 2);
            z.untilOpen = z.active && z.type === 'gate' ? z.period - phase : 0;
            if (distance(s.bee, z) < z.r) {
                if (z.type === 'wind' && z.active) s.conditions.wind = true;
                if (z.type === 'dark') s.conditions.dark = true;
                if (z.type === 'gate' && z.active) s.conditions.blocked = true;
            }
        }
        s.conditions.rain = this.world.hazards.some(h => h.type === 'rain' && h.active && distance(s.bee, h) < h.r + 20);
    }

    moveBee(dt, input) {
        const s = this.state, { bee } = s;
        let dx = input.x || 0, dy = input.y || 0;
        const length = Math.hypot(dx, dy);
        if (length > 1) { dx /= length; dy /= length; }
        const moving = length > 0.05;
        const atHive = this.world.hives.some(h => distance(bee, h) < 78);
        if (atHive) s.energy += 26 * dt;
        else if (moving) s.energy -= (1.2 + this.level.id * 0.6) * this.level.rules.energyDrain * (s.conditions.rain ? 1.35 : 1) * dt;
        else s.energy += 2.5 * dt;
        s.energy = clamp(s.energy, 0, s.maxEnergy);
        s.minEnergy = Math.min(s.minEnergy, s.energy);
        if (s.energy <= 0 && !this.exhaustionNotified) {
            this.exhaustionNotified = true;
            this.emit('exhausted', { text: 'Low energy: glide to nectar or a hive. Stop moving to catch your breath.' });
        }
        if (s.energy > 20) this.exhaustionNotified = false;
        const boosting = bee.abilityTime > 0 && s.ability === 'dash';
        const reserve = 0.49 + 0.51 * clamp(s.energy / 18, 0, 1);
        const speed = (boosting ? 490 : 235 * reserve) * (s.conditions.rain ? 0.69 : 1);
        let windX = 0, windY = 0;
        for (const z of this.world.zones) if (z.type === 'wind' && z.active && distance(bee, z) < z.r) {
            const gust = 0.7 + 0.3 * Math.sin(s.elapsed * 1.7 + z.phase);
            const force = z.force * gust * this.level.rules.hazardSpeed;
            windX += Math.cos(z.angle) * force; windY += Math.sin(z.angle) * force;
        }
        const ease = 1 - Math.exp(-dt * (s.conditions.rain ? 5 : 11));
        bee.vx += (dx * speed + windX - bee.vx) * ease;
        bee.vy += (dy * speed + windY - bee.vy) * ease;
        bee.x = clamp(bee.x + bee.vx * dt, 24, this.world.width - 24);
        bee.y = clamp(bee.y + bee.vy * dt, 24, this.world.height - 24);
        if (Math.hypot(bee.vx, bee.vy) > 15) bee.angle = Math.atan2(bee.vy, bee.vx);
        const barriers = [...this.world.obstacles, ...this.world.zones.filter(z => z.type === 'gate' && z.active)];
        for (const o of barriers) {
            const d = distance(bee, o), min = o.r + 17;
            if (d < min) {
                const angle = d > 0.001 ? Math.atan2(bee.y - o.y, bee.x - o.x) : 0;
                bee.x = clamp(o.x + Math.cos(angle) * min, 24, this.world.width - 24);
                bee.y = clamp(o.y + Math.sin(angle) * min, 24, this.world.height - 24);
                if (o.type === 'gate') s.conditions.blocked = true;
            }
        }
    }

    updateHazards(dt) {
        const s = this.state, bee = s.bee, factor = this.level.rules.hazardSpeed;
        for (const h of this.world.hazards) {
            const speed = h.speed ?? 0.6;
            const range = h.range ?? (h.type === 'spider' ? 0 : h.type === 'rain' ? 70 : 130);
            const phase = s.elapsed * speed * factor + h.phase;
            h.warning = false;
            if (h.type === 'wasp') this.updateWasp(h, dt);
            else {
                if (speed !== 0 && range !== 0) {
                    if (h.type === 'bird') {
                        h.x = h.originX + Math.sin(phase) * range;
                        h.y = h.originY + (h.path === 'cross' ? Math.sin(phase * 2) * 0.38 : Math.cos(phase * 0.83) * 0.55) * range;
                    } else if (h.type === 'spider') {
                        h.x = h.originX + Math.sin(phase) * range;
                        h.y = h.originY + Math.sin(phase * 1.7) * range * 0.42;
                    } else if (h.type === 'rain') h.x = h.originX + Math.sin(phase * 0.4) * range;
                    else if (h.type === 'machine') {
                        const sweep = Math.sin(phase) * range;
                        h.x = h.originX + (h.axis !== 'y' ? sweep : 0);
                        h.y = h.originY + (h.axis === 'y' ? sweep : 0);
                    }
                }
                if (h.type === 'pesticide' || (h.type === 'rain' && h.period)) {
                    const t = cycle(s.elapsed * factor + h.phase, h.period || 9);
                    const clearUntil = h.openFor ?? 4;
                    h.active = t >= clearUntil;
                    h.warning = !h.active && t >= clearUntil - (h.warningTime || 2);
                } else if (h.type === 'machine') {
                    const t = cycle(s.elapsed * factor + h.phase, 10);
                    h.active = t >= 2;
                    h.warning = t >= 1 && t < 2;
                } else h.active = true;
            }
            h.x = clamp(h.x, h.r + 8, this.world.width - h.r - 8);
            h.y = clamp(h.y, h.r + 8, this.world.height - h.r - 8);
            const protectedBee = bee.abilityTime > 0 && (s.ability === 'shield' || s.ability === 'dash');
            const hiveRefuge = this.world.hives.some(hive => distance(bee, hive) < 85);
            if (h.active && distance(bee, h) < h.r + 12 && !protectedBee && !hiveRefuge && bee.invulnerable <= 0) this.takeDamage(h);
            if (s.mode !== 'playing') return;
        }
    }

    updateWasp(h, dt) {
        const s = this.state, bee = s.bee, factor = this.level.rules.hazardSpeed;
        const refuge = this.world.hives.some(hive => distance(bee, hive) < 130);
        h.timer = Math.max(0, h.timer - dt);
        if (h.behaviorState === 'patrol') {
            const phase = s.elapsed * (h.speed ?? 0.5) * factor + h.phase;
            h.x = h.originX + Math.sin(phase) * 42;
            h.y = h.originY + Math.cos(phase * 1.3) * 30;
            if (!refuge && Math.hypot(bee.vx, bee.vy) > 30 && distance(bee, h) < (h.detection || 230)) {
                h.behaviorState = 'warning'; h.timer = 0.85;
                h.targetX = bee.x; h.targetY = bee.y;
            }
        } else if (h.behaviorState === 'warning' && !h.timer) {
            h.behaviorState = 'chase'; h.timer = h.chaseDuration || 2.8;
        } else if (h.behaviorState === 'chase') {
            if (!h.timer || refuge || distance(h, { x: h.originX, y: h.originY }) > (h.range || 140) + 180) {
                h.behaviorState = 'rest'; h.timer = h.restDuration || 3.5;
            } else {
                // Limited pursuit reacts to the flight direction, with a readable warning first.
                h.targetX = bee.x + bee.vx * 0.22; h.targetY = bee.y + bee.vy * 0.22;
                const angle = Math.atan2(h.targetY - h.y, h.targetX - h.x);
                h.x += Math.cos(angle) * (h.chaseSpeed || 155) * factor * dt;
                h.y += Math.sin(angle) * (h.chaseSpeed || 155) * factor * dt;
            }
        } else if (h.behaviorState === 'rest') {
            h.x += (h.originX - h.x) * Math.min(1, dt * 1.3);
            h.y += (h.originY - h.y) * Math.min(1, dt * 1.3);
            if (!h.timer) h.behaviorState = 'patrol';
        }
        h.warning = h.behaviorState === 'warning';
        h.active = h.behaviorState !== 'rest' && h.behaviorState !== 'warning';
    }

    takeDamage(h) {
        const s = this.state, bee = s.bee;
        s.health--; s.damageTaken++; s.combo = 0; s.multiplier = 1; s.comboTimer = 0; s.cleanStreak = 0;
        bee.invulnerable = this.level.rules.grace;
        const angle = Math.atan2(bee.y - h.y, bee.x - h.x);
        bee.vx = Math.cos(angle) * 220; bee.vy = Math.sin(angle) * 220;
        this.burst(bee.x, bee.y, '#ffbd95', 16);
        this.emit('damage', { type: h.type, health: s.health });
        if (s.health <= 0) this.finish(false, 'health');
    }

    updateFlowers(dt) {
        const s = this.state;
        const range = s.ability === 'magnet' && s.bee.abilityTime > 0 ? 112 : 39;
        for (const f of this.world.flowers) {
            if (f.behavior === 'moving') {
                f.x = f.originX + Math.sin(s.elapsed * 0.85 + f.phase) * f.moveRange;
                f.y = f.originY + Math.cos(s.elapsed * 0.68 + f.phase) * f.moveRange * 0.65;
            }
            f.cooldown = Math.max(0, f.cooldown - dt);
            const t = cycle(s.elapsed + (f.phase || 0), f.period || 12);
            f.open = f.behavior !== 'timed' || t < f.openFor;
            f.untilOpen = f.open ? 0 : f.period - t;
            if (!f.revealed && distance(f, s.bee) < (this.level.difficulty === 'easy' ? 155 : 125)) {
                f.revealed = true;
                this.emit('reveal', { type: f.type, text: 'A hidden bloom! Fly closer to collect it.' });
                this.burst(f.x, f.y, '#fce8ad', 16);
            }
            f.ready = f.cooldown === 0 && f.open && f.revealed;
        }
        const flowers = [...this.world.flowers].sort((a, b) => distance(s.bee, a) - distance(s.bee, b));
        for (const f of flowers) {
            if (!f.ready || distance(s.bee, f) > range) continue;
            if (s.carried >= s.capacity) {
                if (!this.contactHint) { this.emit('hint', { text: 'Pollen baskets full! Follow a hive marker to make a delivery and refill energy.' }); this.contactHint = 5; }
                continue;
            }
            f.ready = false; f.cooldown = 7; f.visits++;
            s.carried++; s.collected++; s.cleanStreak++;
            s.maxCleanStreak = Math.max(s.maxCleanStreak, s.cleanStreak);
            s.inventory[f.type] = (s.inventory[f.type] || 0) + 1;
            this.collectedSpecies.add(f.type);
            s.energy = Math.min(s.maxEnergy, s.energy + 18);
            if (f.behavior === 'hidden' && !f.found) { f.found = true; s.hiddenFound++; }
            if (f.rare && !this.rareFlowers.has(f.id)) { this.rareFlowers.add(f.id); s.rareCollected++; }
            this.increaseCombo(f.id);
            s.score += Math.round((f.rare ? 45 : 10) * s.multiplier);
            this.burst(f.x, f.y, f.rare ? '#fff2a7' : '#ffda57', 14);
            this.emit('discover', { id: f.type });
            this.emit('collect', { type: f.type, carried: s.carried, rare: f.rare, energy: s.energy });
            const mature = f.visits >= f.visitsRequired;
            if (s.sequence[s.sequenceIndex] === f.type && s.lastSequenceFlower !== f.id && mature) {
                s.lastSequenceFlower = f.id; s.sequenceIndex++;
                if (s.sequenceIndex % 2 === 0) {
                    f.pollinated = true; s.score += Math.round(35 * s.multiplier);
                    this.burst(f.x, f.y, '#ffa1ba', 20); this.emit('pollinate', { type: f.type });
                }
                if (s.sequenceIndex >= s.sequence.length) this.completeTrail();
            } else if (!mature) {
                this.emit('hint', { text: `This bloom needs ${f.visitsRequired} visits to fully pollinate (${f.visits}/${f.visitsRequired}). Return when its pollen replenishes.` });
            } else if (s.sequence.length && !this.contactHint) {
                this.emit('hint', { text: s.lastSequenceFlower === f.id ? 'Try a different flower of the same species to carry its pollen onward.' : 'Pollen collected! Follow the numbered flower trail for your restoration goal.' });
                this.contactHint = 5;
            }
            if (f.behavior === 'multi' && mature && !f.pollinated) {
                f.pollinated = true; s.score += Math.round(60 * s.multiplier);
                this.emit('pollinate', { type: f.type });
            }
        }
    }

    increaseCombo(flowerId) {
        const s = this.state;
        // Camping on a single replenishing flower cannot build a skilled-flight combo.
        if (s.lastComboFlower === flowerId) return;
        s.lastComboFlower = flowerId;
        s.combo++; s.comboTimer = this.level.rules.comboWindow;
        s.maxCombo = Math.max(s.maxCombo, s.combo);
        s.multiplier = Math.min(3, 1 + Math.floor(s.combo / 3) * 0.5);
        if (s.combo % 3 === 0) this.emit('combo', { count: s.combo, multiplier: s.multiplier });
    }

    completeTrail() {
        const s = this.state, patch = this.world.patches[s.challengeIndex];
        s.challengeIndex++; s.score += 100;
        if (patch) { patch.restored = true; s.restored++; this.burst(patch.x, patch.y, '#c5f27e', 40); }
        s.sequence = [...(this.level.sequences[s.challengeIndex] || [])];
        s.sequenceIndex = 0; s.lastSequenceFlower = null;
        this.emit('restore', { restored: s.restored, trails: s.challengeIndex });
        if (s.challengeIndex === this.level.sequences.length) this.emit('discover', { id: 'restoration' });
    }

    deliver() {
        const s = this.state;
        if (s.carried === 0) return;
        const hive = this.world.hives.find(h => distance(s.bee, h) <= 69);
        if (!hive) return;
        const count = s.carried;
        s.delivered += count; s.score += count * 30; s.carried = 0;
        s.hiveDeliveries[hive.id] = (s.hiveDeliveries[hive.id] || 0) + count;
        for (const [type, amount] of Object.entries(s.inventory)) s.deliveredTypes[type] = (s.deliveredTypes[type] || 0) + amount;
        s.inventory = {};
        s.health = Math.min(s.maxHealth, s.health + 1);
        this.burst(hive.x, hive.y, '#ffe69a', 26);
        this.emit('discover', { id: 'hive' });
        this.emit('deliver', { count, delivered: s.delivered, hiveId: hive.id });
    }

    updateBonus() {
        const s = this.state, m = this.level.missions;
        s.bonusProgress = m.bonusType === 'rare' ? s.rareCollected : m.bonusType === 'clean' ? s.cleanStreak : this.collectedSpecies.size;
        if (s.bonusComplete) return;
        if (m.deadline && s.elapsed > m.deadline) { s.bonusFailed = true; return; }
        if (s.bonusProgress >= m.bonusTarget) {
            s.bonusComplete = true; s.score += 200;
            this.emit('bonus', { score: 200, text: 'Habitat bonus complete! +200 points. Master medal is within reach.' });
        }
    }

    objectivesComplete() {
        const s = this.state, m = this.level.missions;
        return s.delivered >= s.target && s.challengeIndex >= this.level.sequences.length
            && Object.entries(m.typed || {}).every(([type, count]) => (s.deliveredTypes[type] || 0) >= count)
            && this.world.hives.every(hive => (s.hiveDeliveries[hive.id] || 0) >= (hive.quota || 0))
            && s.hiddenFound >= (m.hiddenRequired || 0);
    }

    finish(won, reason) {
        const s = this.state;
        if (s.mode !== 'playing') return;
        s.mode = won ? 'won' : 'lost';
        if (won) s.score += Math.floor(s.time) * 2 + s.health * 50;
        this.emit('finish', { won, reason, score: s.score });
    }

    burst(x, y, color, count) {
        if (this.state.reducedMotion) return;
        for (let i = 0; i < count && this.state.particles.length < 220; i++) {
            const angle = (i / count) * Math.PI * 2, life = 0.5 + Math.random() * 0.45;
            this.state.particles.push({ x, y, vx: Math.cos(angle) * (30 + Math.random() * 65), vy: Math.sin(angle) * 65 - 20, life, maxLife: life, color, size: 2 + Math.random() * 3 });
        }
    }

    updateParticles(dt) {
        this.state.particles = this.state.particles.filter(p => {
            p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 30 * dt;
            return p.life > 0;
        });
    }
}
