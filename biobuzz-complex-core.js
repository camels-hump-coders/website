import { ABILITIES } from './biobuzz-complex-data.js';

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** The simulation has no browser dependencies. All UI, sound, and saves use events. */
export class BioBuzzGame {
    constructor(level, { ability = 'dash', capacity = 6, reducedMotion = false, onEvent = () => {} } = {}) {
        this.level = level;
        this.emit = onEvent;
        this.world = {
            ...level,
            flowers: level.flowers.map((f, id) => ({ ...f, id, ready: true, cooldown: 0, pollinated: false })),
            hazards: level.hazards.map((h, id) => ({ ...h, id, originX: h.x, originY: h.y, phase: h.phase ?? id, active: true })),
            obstacles: level.obstacles.map(o => ({ ...o })),
            patches: level.patches.map(p => ({ ...p, restored: false }))
        };
        this.state = {
            mode: 'playing', bee: { x: level.hive.x + 105, y: level.hive.y, vx: 0, vy: 0, angle: 0, invulnerable: 0, abilityTime: 0 },
            camera: { x: 0, y: 0 }, time: level.time, elapsed: 0, score: 0, health: 5, maxHealth: 5,
            carried: 0, capacity, delivered: 0, target: level.target, collected: 0, damageTaken: 0,
            ability, cooldown: 0, sequence: [...level.sequences[0]], sequenceIndex: 0, challengeIndex: 0,
            particles: [], reducedMotion, restored: 0, lastSequenceFlower: null
        };
        this.encounters = new Set();
        this.contactHint = 0;
    }

    activateAbility() {
        const s = this.state;
        if (s.mode !== 'playing' || s.cooldown > 0) return false;
        const ability = ABILITIES.find(a => a.id === s.ability) || ABILITIES[0];
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
        this.contactHint = Math.max(0, this.contactHint - dt);
        this.moveBee(dt, input);
        this.updateHazards(dt);
        if (s.mode !== 'playing') return;
        this.updateFlowers(dt);
        this.deliver();
        this.updateParticles(dt);
        for (const h of this.world.hazards) {
            if (distance(s.bee, h) < h.r + 160 && !this.encounters.has(h.type)) {
                this.encounters.add(h.type);
                this.emit('discover', { id: h.type });
            }
        }
        if (s.delivered >= s.target && s.challengeIndex >= this.level.sequences.length) this.finish(true);
        else if (s.time <= 0) this.finish(false, 'time');
    }

    moveBee(dt, input) {
        const { bee } = this.state;
        let dx = input.x || 0, dy = input.y || 0;
        const length = Math.hypot(dx, dy);
        if (length > 1) { dx /= length; dy /= length; }
        const boosting = bee.abilityTime > 0 && this.state.ability === 'dash';
        const speed = boosting ? 490 : 235;
        const ease = 1 - Math.exp(-dt * 11);
        bee.vx += (dx * speed - bee.vx) * ease;
        bee.vy += (dy * speed - bee.vy) * ease;
        bee.x = clamp(bee.x + bee.vx * dt, 24, this.world.width - 24);
        bee.y = clamp(bee.y + bee.vy * dt, 24, this.world.height - 24);
        if (Math.hypot(bee.vx, bee.vy) > 15) bee.angle = Math.atan2(bee.vy, bee.vx);
        for (const o of this.world.obstacles) {
            const d = distance(bee, o), min = o.r + 17;
            if (d < min) {
                const angle = d > 0.001 ? Math.atan2(bee.y - o.y, bee.x - o.x) : 0;
                bee.x = clamp(o.x + Math.cos(angle) * min, 24, this.world.width - 24);
                bee.y = clamp(o.y + Math.sin(angle) * min, 24, this.world.height - 24);
            }
        }
    }

    updateHazards() {
        const s = this.state, bee = s.bee;
        for (const h of this.world.hazards) {
            const phase = s.elapsed * (h.speed ?? 0.6) + h.phase;
            if (h.type === 'bird') {
                h.x = h.originX + Math.sin(phase) * (h.range ?? 130);
                h.y = h.originY + Math.cos(phase * 0.7) * (h.range ?? 130) * 0.45;
            } else if (h.type === 'rain') {
                h.x = h.originX + Math.sin(phase * 0.4) * (h.range ?? 70);
            }
            h.active = h.type !== 'pesticide' || (s.elapsed + h.phase) % 9 > 4;
            h.warning = h.type === 'pesticide' && (s.elapsed + h.phase) % 9 > 2 && !h.active;
            const protectedBee = bee.abilityTime > 0 && (s.ability === 'shield' || s.ability === 'dash');
            if (h.active && distance(bee, h) < h.r + 12 && !protectedBee && bee.invulnerable <= 0) {
                s.health--;
                s.damageTaken++;
                bee.invulnerable = 2.4;
                const angle = Math.atan2(bee.y - h.y, bee.x - h.x);
                bee.vx = Math.cos(angle) * 220;
                bee.vy = Math.sin(angle) * 220;
                this.burst(bee.x, bee.y, '#ffbd95', 16);
                this.emit('damage', { type: h.type, health: s.health });
                if (s.health <= 0) { this.finish(false, 'health'); return; }
            }
        }
    }

    updateFlowers(dt) {
        const s = this.state;
        const range = s.ability === 'magnet' && s.bee.abilityTime > 0 ? 112 : 39;
        // Nearest-first makes overlapping magnet pickups and trail order predictable.
        const flowers = [...this.world.flowers].sort((a, b) => distance(s.bee, a) - distance(s.bee, b));
        for (const f of flowers) {
            f.cooldown = Math.max(0, f.cooldown - dt);
            f.ready = f.cooldown === 0;
            if (!f.ready || distance(s.bee, f) > range) continue;
            if (s.carried >= s.capacity) {
                if (!this.contactHint) { this.emit('hint', { text: 'Pollen baskets full! Follow the hive marker to make a delivery.' }); this.contactHint = 5; }
                continue;
            }
            f.ready = false;
            f.cooldown = 7;
            s.carried++;
            s.collected++;
            s.score += 10;
            this.burst(f.x, f.y, '#ffda57', 14);
            this.emit('discover', { id: f.type });
            this.emit('collect', { type: f.type, carried: s.carried });
            if (s.sequence[s.sequenceIndex] === f.type && s.lastSequenceFlower !== f.id) {
                s.lastSequenceFlower = f.id;
                s.sequenceIndex++;
                if (s.sequenceIndex % 2 === 0) {
                    f.pollinated = true;
                    s.score += 35;
                    this.burst(f.x, f.y, '#ffa1ba', 20);
                    this.emit('pollinate', { type: f.type });
                }
                if (s.sequenceIndex >= s.sequence.length) this.completeTrail();
            } else if (s.sequence.length && !this.contactHint) {
                this.emit('hint', { text: s.lastSequenceFlower === f.id ? 'Try a different flower of the same species to carry its pollen onward.' : 'Pollen collected! Follow the numbered flower trail for your restoration goal.' });
                this.contactHint = 5;
            }
        }
    }

    completeTrail() {
        const s = this.state, patch = this.world.patches[s.challengeIndex];
        s.challengeIndex++;
        s.score += 100;
        if (patch) {
            patch.restored = true;
            s.restored++;
            this.burst(patch.x, patch.y, '#c5f27e', 40);
        }
        s.sequence = [...(this.level.sequences[s.challengeIndex] || [])];
        s.sequenceIndex = 0;
        s.lastSequenceFlower = null;
        this.emit('restore', { restored: s.restored, trails: s.challengeIndex });
        if (s.challengeIndex === this.level.sequences.length) this.emit('discover', { id: 'restoration' });
    }

    deliver() {
        const s = this.state;
        if (distance(s.bee, this.world.hive) > 69 || s.carried === 0) return;
        const count = s.carried;
        s.delivered += count;
        s.score += count * 30;
        s.carried = 0;
        s.health = Math.min(s.maxHealth, s.health + 1);
        this.burst(this.world.hive.x, this.world.hive.y, '#ffe69a', 26);
        this.emit('discover', { id: 'hive' });
        this.emit('deliver', { count, delivered: s.delivered });
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
            const angle = (i / count) * Math.PI * 2;
            const life = 0.5 + Math.random() * 0.45;
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
