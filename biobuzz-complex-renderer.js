import { FLOWERS } from './biobuzz-complex-data.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const THEMES = {
    garden: { ground: '#608b62', light: '#83aa70', dark: '#3b684b', grass: '#a1bb7b', path: '#bac38b' },
    meadow: { ground: '#769856', light: '#9cb575', dark: '#52774d', grass: '#bed189', path: '#c8c796' },
    forest: { ground: '#466f55', light: '#658763', dark: '#29563f', grass: '#90a66e', path: '#9fAD7d' },
    farm: { ground: '#829361', light: '#a2ae73', dark: '#5b734a', grass: '#c1c587', path: '#c8bc8d' },
    preserve: { ground: '#588b6c', light: '#83ae84', dark: '#376952', grass: '#b5d094', path: '#b6c899' },
};

function randomSeed(seed) {
    let value = seed >>> 0;
    return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; };
}
function circle(ctx, x, y, r, color) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = color; ctx.fill();
}
function ellipse(ctx, x, y, rx, ry, rotation, color) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rotation, 0, TAU); ctx.fillStyle = color; ctx.fill();
}
function rounded(ctx, x, y, w, h, r, color) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = color; ctx.fill();
}
function text(ctx, str, x, y, size = 12, color = '#fff7dc', weight = 700) {
    ctx.fillStyle = color; ctx.font = `${weight} ${size}px "DM Sans", system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(str, x, y);
}

/** Procedural art, scenery caching, camera and HUD hints are separate from simulation. */
export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.viewWidth = 1100;
        this.viewHeight = 650;
        this.camera = { x: 0, y: 0 };
        this.scenery = new WeakMap();
        this.lastWorld = null;
        this.resize();
    }

    resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = this.canvas.getBoundingClientRect();
        const width = Math.max(1, Math.round((rect.width || this.viewWidth) * dpr));
        const height = Math.max(1, Math.round((rect.height || this.viewHeight) * dpr));
        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
        this.scaleX = width / this.viewWidth;
        this.scaleY = height / this.viewHeight;
    }

    project(x, y) { return { x: x - this.camera.x, y: y - this.camera.y }; }

    buildScenery(world) {
        const rand = randomSeed(world.width * 37 + world.height * 13);
        const ground = [], grass = [], stones = [], blooms = [], butterflies = [];
        for (let i = 0; i < world.width * world.height / 12500; i++) {
            ground.push({ x: rand() * world.width, y: rand() * world.height, r: 25 + rand() * 100, a: rand() * 0.1 + 0.03 });
        }
        for (let i = 0; i < world.width * world.height / 3200; i++) {
            grass.push({ x: rand() * world.width, y: rand() * world.height, size: 3 + rand() * 6, phase: rand() * TAU, light: rand() > 0.5 });
        }
        for (let i = 0; i < 65; i++) stones.push({ x: rand() * world.width, y: rand() * world.height, r: rand() * 3 + 1 });
        for (let i = 0; i < world.width * world.height / 14000; i++) {
            blooms.push({ x: rand() * world.width, y: rand() * world.height, r: 1.5 + rand() * 1.5, color: ['#e7dab0', '#caafc3', '#aec0df', '#e6ce85'][Math.floor(rand() * 4)] });
        }
        for (let i = 0; i < 7; i++) butterflies.push({ x: rand() * world.width, y: rand() * world.height, phase: rand() * TAU, color: ['#f7cea0', '#f5abcc', '#c4caef'][i % 3] });
        const scenery = { ground, grass, stones, blooms, butterflies };
        this.scenery.set(world, scenery);
        return scenery;
    }

    visible(x, y, margin = 100) {
        return x >= this.camera.x - margin && x <= this.camera.x + this.viewWidth + margin
            && y >= this.camera.y - margin && y <= this.camera.y + this.viewHeight + margin;
    }

    draw(world, state, options = {}) {
        if (!world || !state?.bee) return;
        const ctx = this.ctx;
        const time = options.reducedMotion || state.reducedMotion ? 0 : state.elapsed || 0;
        const theme = THEMES[world.theme] || THEMES.garden;
        const scene = this.scenery.get(world) || this.buildScenery(world);
        const desiredX = clamp(state.bee.x - this.viewWidth * 0.5, 0, Math.max(0, world.width - this.viewWidth));
        const desiredY = clamp(state.bee.y - this.viewHeight * 0.5, 0, Math.max(0, world.height - this.viewHeight));
        const newWorld = this.lastWorld !== world;
        this.camera.x += (desiredX - this.camera.x) * (newWorld || !time ? 1 : 0.1);
        this.camera.y += (desiredY - this.camera.y) * (newWorld || !time ? 1 : 0.1);
        this.lastWorld = world;
        if (state.camera) { state.camera.x = this.camera.x; state.camera.y = this.camera.y; }
        ctx.setTransform(this.scaleX, 0, 0, this.scaleY, 0, 0);
        ctx.clearRect(0, 0, this.viewWidth, this.viewHeight);
        ctx.fillStyle = theme.ground; ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
        ctx.save();
        ctx.translate(-this.camera.x, -this.camera.y);
        this.drawTerrain(world, scene, theme, time);
        for (const patch of world.patches || []) if (this.visible(patch.x, patch.y, patch.r + 20)) this.drawPatch(patch, time);
        this.drawGardenDetails(world, theme);
        for (const flower of world.flowers || []) {
            if (!this.visible(flower.x, flower.y)) continue;
            const target = state.carried < state.capacity && state.sequence[state.sequenceIndex] === flower.type && state.lastSequenceFlower !== flower.id;
            this.drawFlower(flower, time, target, state.sequenceIndex);
        }
        const objects = [
            ...(world.obstacles || []).map(item => ({ ...item, kind: 'obstacle' })),
            { ...world.hive, kind: 'hive' },
            ...(world.hazards || []).map(item => ({ ...item, kind: 'hazard' })),
        ].sort((a, b) => a.y - b.y);
        for (const object of objects) {
            if (!this.visible(object.x, object.y, (object.r || 80) + 100)) continue;
            if (object.kind === 'obstacle') this.drawObstacle(object, time);
            if (object.kind === 'hive') this.drawHive(object, time, state);
            if (object.kind === 'hazard') this.drawHazard(object, time);
        }
        this.drawButterflies(scene, time);
        this.drawParticles(state.particles || []);
        this.drawBee(state, time);
        ctx.restore();
        this.drawAtmosphere(time, world.theme);
        if (state.mode !== 'menu') {
            this.drawWaypoints(world, state);
            this.drawMinimap(world, state);
        }
    }

    drawTerrain(world, scene, theme, time) {
        const ctx = this.ctx;
        for (const patch of scene.ground) {
            if (!this.visible(patch.x, patch.y, patch.r)) continue;
            ctx.globalAlpha = patch.a;
            ellipse(ctx, patch.x, patch.y, patch.r, patch.r * 0.55, 0.3, theme.light);
        }
        ctx.globalAlpha = 1;
        // Broad meandering footpaths establish a legible garden rather than a flat field.
        ctx.lineCap = 'round';
        const path = () => {
            ctx.beginPath(); ctx.moveTo(-80, world.hive.y + 100);
            ctx.bezierCurveTo(world.width * 0.25, world.hive.y + 160, world.width * 0.45, world.height * 0.2, world.width * 0.65, world.height * 0.52);
            ctx.bezierCurveTo(world.width * 0.84, world.height * 0.8, world.width * 0.92, world.height * 0.62, world.width + 80, world.height * 0.72);
        };
        path(); ctx.strokeStyle = 'rgba(36,66,39,.09)'; ctx.lineWidth = 87; ctx.stroke();
        path(); ctx.strokeStyle = theme.path; ctx.globalAlpha = 0.48; ctx.lineWidth = 70; ctx.stroke();
        path(); ctx.strokeStyle = '#d1ce9f'; ctx.globalAlpha = 0.15; ctx.lineWidth = 44; ctx.stroke(); ctx.globalAlpha = 1;
        for (const tuft of scene.grass) {
            if (!this.visible(tuft.x, tuft.y, 15)) continue;
            const sway = Math.sin(time * 1.3 + tuft.phase) * 1.7;
            ctx.strokeStyle = tuft.light ? theme.grass : theme.dark; ctx.globalAlpha = 0.38;
            ctx.lineWidth = 1.4; ctx.beginPath();
            ctx.moveTo(tuft.x - 3, tuft.y); ctx.quadraticCurveTo(tuft.x - 5, tuft.y - tuft.size * 0.8, tuft.x - 3 + sway, tuft.y - tuft.size);
            ctx.moveTo(tuft.x, tuft.y + 1); ctx.quadraticCurveTo(tuft.x + 1, tuft.y - tuft.size, tuft.x + 3 + sway, tuft.y - tuft.size - 3);
            ctx.moveTo(tuft.x + 3, tuft.y + 2); ctx.lineTo(tuft.x + 6 + sway, tuft.y - tuft.size * 0.6); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        for (const stone of scene.stones) if (this.visible(stone.x, stone.y, 8)) ellipse(ctx, stone.x, stone.y, stone.r + 1, stone.r, 0.2, '#81906d');
        for (const bloom of scene.blooms) {
            if (!this.visible(bloom.x, bloom.y, 8)) continue;
            circle(ctx, bloom.x, bloom.y, bloom.r, bloom.color);
            circle(ctx, bloom.x + 3, bloom.y - 2, bloom.r * 0.6, bloom.color);
        }
        // Subtle boundary planting makes the world limits visually apparent.
        ctx.strokeStyle = 'rgba(27,58,37,.22)'; ctx.lineWidth = 24;
        ctx.strokeRect(7, 7, world.width - 14, world.height - 14);
    }

    drawGardenDetails(world) {
        const ctx = this.ctx;
        if (world.theme === 'farm') {
            ctx.save(); ctx.globalAlpha = 0.3;
            for (let row = 0; row < 5; row++) {
                const x = world.width - 390 + row * 60;
                rounded(ctx, x, 145, 35, world.height - 290, 15, '#806f43');
                for (let y = 165; y < world.height - 145; y += 44) {
                    ellipse(ctx, x + 10, y, 8, 15, -0.6, '#c0c17c');
                    ellipse(ctx, x + 23, y - 3, 8, 15, 0.6, '#bdca7f');
                }
            }
            ctx.restore();
        }
        if (world.theme === 'garden') {
            for (let x = 60; x < world.width; x += 38) {
                if (!this.visible(x, 45)) continue;
                rounded(ctx, x, 28, 10, 45, 3, '#c5bd92');
                ctx.fillStyle = '#b2b28c'; ctx.fillRect(x, 42, 38, 7); ctx.fillRect(x, 61, 38, 6);
            }
        }
    }

    drawPatch(patch, time) {
        const ctx = this.ctx;
        const { x, y, r, restored } = patch;
        ctx.save();
        ellipse(ctx, x, y, r, r * 0.71, -0.12, restored ? 'rgba(187,210,132,.27)' : 'rgba(187,162,108,.19)');
        ctx.strokeStyle = restored ? 'rgba(218,237,165,.28)' : 'rgba(198,183,129,.32)';
        ctx.lineWidth = 2; ctx.setLineDash([3, 10]);
        ctx.beginPath(); ctx.ellipse(x, y, r - 6, r * 0.67, -0.12, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        if (restored) {
            for (let i = 0; i < 15; i++) {
                const angle = i * 2.4, spread = Math.sqrt(i / 15) * r * 0.76;
                const px = x + Math.cos(angle) * spread, py = y + Math.sin(angle) * spread * 0.65;
                ctx.strokeStyle = '#6d965a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py + 10); ctx.lineTo(px, py); ctx.stroke();
                const colors = ['#eccde2', '#ead580', '#c4b8ed'];
                for (let j = 0; j < 5; j++) circle(ctx, px + Math.cos(j * TAU / 5) * 4, py + Math.sin(j * TAU / 5) * 4, 3.5, colors[i % 3]);
                circle(ctx, px, py, 2.5, '#fcdd8b');
            }
            text(ctx, 'HABITAT RESTORED', x, y + r * 0.79, 9, '#e4ecc3');
        } else {
            ctx.strokeStyle = '#aaa478'; ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
                const px = x + Math.cos(i * 2.3) * r * 0.62, py = y + Math.sin(i * 2.3) * r * 0.4;
                ctx.beginPath(); ctx.moveTo(px, py + 7); ctx.lineTo(px - 2, py - 5); ctx.moveTo(px - 1, py + 2); ctx.lineTo(px + 5, py - 3); ctx.stroke();
            }
            text(ctx, 'ROOM TO BLOOM', x, y + r * 0.8, 9, '#d3d2a7');
        }
        ctx.restore();
    }

    drawFlower(flower, time, target, sequenceIndex) {
        const ctx = this.ctx, data = FLOWERS[flower.type] || FLOWERS.clover;
        const { x, y } = flower;
        const sway = Math.sin(time * 1.6 + x * 0.03) * 2.3;
        ctx.save();
        ellipse(ctx, x + 2, y + 18, 27, 11, 0, 'rgba(28,56,34,.2)');
        ctx.strokeStyle = '#315d42'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y + 20); ctx.quadraticCurveTo(x - 4, y + 3, x + sway, y - 5); ctx.stroke();
        ellipse(ctx, x - 11, y + 14, 12, 5, 0.45, '#a2bc7c');
        ellipse(ctx, x + 10, y + 7, 13, 5, -0.55, '#b0c887');
        if (target && flower.ready) {
            ctx.strokeStyle = '#f6edb9'; ctx.lineWidth = 1.8; ctx.globalAlpha = 0.65 + Math.sin(time * 3) * 0.15;
            ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.ellipse(x, y + 10, 40, 28, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        }
        ctx.translate(x + sway, y - 7);
        ctx.globalAlpha = flower.ready ? 1 : 0.57;
        const petals = data.petals || 8;
        for (let i = 0; i < petals; i++) {
            const angle = i / petals * TAU + flower.x * 0.001;
            ellipse(ctx, Math.cos(angle) * 14, Math.sin(angle) * 14, 12, flower.type === 'monarda' ? 4 : 7, angle, '#355e43');
        }
        ctx.translate(0, -2);
        for (let i = 0; i < petals; i++) {
            const angle = i / petals * TAU + flower.x * 0.001;
            ellipse(ctx, Math.cos(angle) * 14, Math.sin(angle) * 14, 12, flower.type === 'monarda' ? 4 : 7, angle, data.color);
            ellipse(ctx, Math.cos(angle) * 17, Math.sin(angle) * 17, 7, 2, angle, 'rgba(255,255,255,.19)');
        }
        circle(ctx, 0, 0, 10, data.center);
        circle(ctx, -2, -2, 7.5, flower.ready ? '#f3ca60' : data.center);
        for (let i = 0; i < 7; i++) circle(ctx, Math.cos(i * 2.4) * 5, Math.sin(i * 2.4) * 5, 1.2, '#ffed9b');
        ctx.globalAlpha = 1;
        if (flower.ready) {
            for (let i = 0; i < 3; i++) {
                const phase = time * 0.9 + i * 2.1 + flower.x;
                circle(ctx, Math.cos(phase) * (19 + i * 3), -24 - (Math.sin(phase) + 1) * 9, 1.5, '#f7e79c');
            }
        } else if (flower.cooldown > 0) {
            ctx.strokeStyle = '#f5e7ac'; ctx.lineWidth = 2; ctx.globalAlpha = 0.7;
            ctx.beginPath(); ctx.arc(0, 0, 11, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - flower.cooldown / 7)); ctx.stroke(); ctx.globalAlpha = 1;
        }
        if (flower.pollinated) { circle(ctx, 21, 19, 8, '#dbe7a2'); text(ctx, '✓', 21, 19, 11, '#446a43'); }
        if (target && flower.ready) {
            circle(ctx, 23, -25, 10, '#fff3ca');
            text(ctx, String(sequenceIndex + 1), 23, -25, 11, '#5a6440');
        }
        ctx.restore();
    }

    drawObstacle(obstacle, time) {
        const ctx = this.ctx, { x, y, r } = obstacle;
        if (obstacle.type === 'rock') {
            ellipse(ctx, x + 9, y + 15, r * 1.12, r * 0.58, 0.1, 'rgba(25,51,37,.23)');
            ctx.beginPath(); ctx.moveTo(x - r, y + r * 0.2); ctx.lineTo(x - r * 0.7, y - r * 0.56); ctx.lineTo(x + r * 0.13, y - r * 0.84); ctx.lineTo(x + r * 0.84, y - r * 0.4); ctx.lineTo(x + r, y + r * 0.39); ctx.lineTo(x + r * 0.3, y + r * 0.61); ctx.lineTo(x - r * 0.65, y + r * 0.55); ctx.closePath(); ctx.fillStyle = '#859087'; ctx.fill();
            ctx.beginPath(); ctx.moveTo(x - r * 0.7, y - r * 0.56); ctx.lineTo(x + r * 0.13, y - r * 0.84); ctx.lineTo(x + r * 0.73, y - r * 0.3); ctx.lineTo(x + r * 0.05, y + r * 0.02); ctx.lineTo(x - r * 0.81, y + r * 0.13); ctx.closePath(); ctx.fillStyle = '#a6afa0'; ctx.fill();
            ellipse(ctx, x - r * 0.6, y + r * 0.4, r * 0.38, r * 0.15, -0.2, '#748b59');
            return;
        }
        ellipse(ctx, x + 15, y + 18, r * 1.3, r * 0.8, 0.1, 'rgba(27,51,39,.23)');
        rounded(ctx, x - 9, y - 15, 18, 42, 5, '#726343');
        ctx.strokeStyle = '#927c50'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 3, y + 22); ctx.lineTo(x - 3, y - 11); ctx.stroke();
        const sway = Math.sin(time + x) * 1.5;
        circle(ctx, x + sway, y - r * 0.4, r * 1.02, '#315e47');
        circle(ctx, x - r * 0.47 + sway, y - r * 0.52, r * 0.66, '#477754');
        circle(ctx, x + r * 0.41 + sway, y - r * 0.55, r * 0.68, '#4f805b');
        circle(ctx, x - r * 0.11 + sway, y - r * 0.98, r * 0.69, '#608f64');
        circle(ctx, x - r * 0.3 + sway, y - r * 1.12, r * 0.4, '#6f9c6b');
        for (let i = 0; i < 9; i++) {
            const angle = i * 2.4;
            ellipse(ctx, x + Math.cos(angle) * r * 0.67, y - r * 0.62 + Math.sin(angle) * r * 0.45, 6, 3, angle, 'rgba(174,198,118,.28)');
        }
    }

    drawHive(hive, time, state) {
        const ctx = this.ctx, { x, y } = hive;
        const carrying = state.carried > 0;
        if (carrying) {
            ctx.strokeStyle = '#ffe9a0'; ctx.globalAlpha = 0.35 + Math.sin(time * 3) * 0.1; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(x, y + 23, 76, 46, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
        }
        ellipse(ctx, x + 4, y + 28, 60, 25, 0, 'rgba(24,46,31,.27)');
        rounded(ctx, x - 42, y + 22, 84, 12, 5, '#806948');
        rounded(ctx, x - 38, y + 32, 9, 12, 2, '#736548'); rounded(ctx, x + 29, y + 32, 9, 12, 2, '#736548');
        const rows = [{ y: 10, w: 54 }, { y: -7, w: 58 }, { y: -24, w: 54 }, { y: -41, w: 44 }, { y: -55, w: 29 }];
        for (const row of rows) {
            ellipse(ctx, x, y + row.y + 5, row.w, 13, 0, '#bd883c');
            ellipse(ctx, x - 2, y + row.y, row.w, 13, 0, '#e9b457');
            ctx.beginPath(); ctx.ellipse(x - 5, y + row.y - 3, row.w * 0.79, 7, 0, Math.PI * 1.06, TAU * 0.91); ctx.strokeStyle = '#f4ce79'; ctx.lineWidth = 3; ctx.stroke();
        }
        ellipse(ctx, x, y + 9, 17, 21, 0, '#694e31');
        ellipse(ctx, x + 1, y + 12, 12, 16, 0, '#483f2a');
        rounded(ctx, x - 21, y + 28, 42, 6, 2, '#f1ce86');
        // Tiny hexagonal hive crest.
        ctx.beginPath(); for (let i = 0; i < 6; i++) { const angle = i * TAU / 6 + Math.PI / 6; if (!i) ctx.moveTo(x + Math.cos(angle) * 10, y - 34 + Math.sin(angle) * 10); else ctx.lineTo(x + Math.cos(angle) * 10, y - 34 + Math.sin(angle) * 10); } ctx.closePath(); ctx.fillStyle = '#f8d991'; ctx.fill();
        text(ctx, 'H', x, y - 34, 10, '#a37739');
        rounded(ctx, x - 44, y + 53, 88, 25, 12, '#254d3e');
        text(ctx, carrying ? 'DELIVER HERE' : 'THE HIVE', x, y + 66, 10, '#fff0b8');
    }

    drawHazard(hazard, time) {
        const ctx = this.ctx, { x, y, r, type } = hazard;
        ctx.save();
        if (type === 'rain') {
            ellipse(ctx, x, y + 5, r, r * 0.58, 0, 'rgba(51,80,93,.17)');
            ctx.strokeStyle = 'rgba(207,230,238,.46)'; ctx.lineWidth = 1.7;
            for (let i = 0; i < 15; i++) {
                const px = x + Math.sin(i * 17.3) * r * 0.8;
                const py = y - r * 0.4 + ((time * 100 + i * 14) % (r * 1.1));
                ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 4, py + 12); ctx.stroke();
            }
            const cy = y - r * 0.55;
            ellipse(ctx, x, cy + 8, r * 0.82, 20, 0, '#92aeb0');
            circle(ctx, x - r * 0.36, cy, 24, '#aec7c3'); circle(ctx, x, cy - 11, 33, '#bccfc9'); circle(ctx, x + r * 0.4, cy, 24, '#a5bfbd');
            text(ctx, 'PASSING SHOWER', x, y + r + 17, 8, '#dce7d0');
        } else if (type === 'spider') {
            ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(243,238,219,.55)';
            for (let i = 0; i < 8; i++) {
                const angle = i * TAU / 8;
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r); ctx.stroke();
            }
            for (let ring = 1; ring < 5; ring++) {
                ctx.beginPath();
                for (let i = 0; i <= 8; i++) { const angle = i * TAU / 8; const px = x + Math.cos(angle) * r * ring / 4, py = y + Math.sin(angle) * r * ring / 4; if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
                ctx.stroke();
            }
            ctx.strokeStyle = '#453d43'; ctx.lineWidth = 2.5;
            for (let side of [-1, 1]) for (let i = 0; i < 4; i++) {
                ctx.beginPath(); ctx.moveTo(x + side * 5, y + i * 3 - 7); ctx.lineTo(x + side * (15 + Math.sin(time * 2 + i) * 2), y + i * 7 - 18); ctx.lineTo(x + side * 21, y + i * 9 - 13); ctx.stroke();
            }
            ellipse(ctx, x, y + 2, 10, 12, 0, '#6a5160'); circle(ctx, x, y - 9, 8, '#4c4350'); circle(ctx, x - 3, y - 11, 2, '#f6e8d9'); circle(ctx, x + 3, y - 11, 2, '#f6e8d9');
        } else if (type === 'bird') {
            ellipse(ctx, x + 5, y + 22, 30, 10, 0, 'rgba(23,49,36,.2)');
            const flap = Math.sin(time * 7 + hazard.phase) * 0.35;
            ellipse(ctx, x - 19, y - 10, 27, 10, -0.45 + flap, '#b39175');
            ellipse(ctx, x + 19, y - 10, 27, 10, 0.45 - flap, '#c4a382');
            ellipse(ctx, x, y, 14, 23, 0, '#d5b993');
            ellipse(ctx, x, y + 4, 9, 15, 0, '#e9d5ae');
            circle(ctx, x, y - 18, 12, '#aa8971');
            ctx.beginPath(); ctx.moveTo(x - 4, y - 27); ctx.lineTo(x, y - 38); ctx.lineTo(x + 4, y - 27); ctx.closePath(); ctx.fillStyle = '#e7be65'; ctx.fill();
            circle(ctx, x - 5, y - 22, 2, '#322f2a'); circle(ctx, x + 5, y - 22, 2, '#322f2a');
        } else if (type === 'pesticide') {
            const active = hazard.active, warning = hazard.warning;
            circle(ctx, x, y, r, active ? 'rgba(188,214,77,.24)' : warning ? 'rgba(236,195,80,.15)' : 'rgba(53,77,49,.12)');
            ctx.strokeStyle = active ? '#d1dc79' : warning ? '#f2cf7e' : '#8aab77'; ctx.lineWidth = active ? 2 : 1.5; ctx.setLineDash([6, 7]);
            ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
            if (active || warning) for (let i = 0; i < 9; i++) {
                const angle = i * 2.4 + time * 0.17; const spread = Math.sqrt(i / 9) * r * 0.72;
                circle(ctx, x + Math.cos(angle) * spread, y + Math.sin(angle) * spread, 10 + Math.sin(time * 2 + i) * 4, active ? 'rgba(218,229,119,.23)' : 'rgba(228,205,133,.12)');
            }
            rounded(ctx, x - 12, y - 21, 24, 36, 5, '#c9b887'); rounded(ctx, x - 6, y - 30, 12, 10, 2, '#887e64');
            text(ctx, '!', x, y - 3, 22, '#766542');
            text(ctx, active ? 'PESTICIDE DRIFT' : warning ? 'DRIFT INCOMING' : 'SPRAY ZONE', x, y + r + 16, 8, '#ebe4b3');
        }
        ctx.restore();
    }

    drawButterflies(scene, time) {
        const ctx = this.ctx;
        for (const butterfly of scene.butterflies) {
            const x = butterfly.x + Math.sin(time * 0.4 + butterfly.phase) * 34;
            const y = butterfly.y + Math.cos(time * 0.5 + butterfly.phase) * 20;
            if (!this.visible(x, y, 15)) continue;
            const wing = 3 + Math.abs(Math.sin(time * 9 + butterfly.phase)) * 4;
            ellipse(ctx, x - wing * 0.6, y, wing, 4.8, -0.5, butterfly.color);
            ellipse(ctx, x + wing * 0.6, y, wing, 4.8, 0.5, butterfly.color);
            ellipse(ctx, x, y + 1, 1.1, 4, 0, '#4c6150');
        }
    }

    drawParticles(particles) {
        const ctx = this.ctx;
        for (const p of particles) {
            ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
            circle(ctx, p.x, p.y, p.size || 3, p.color || '#ffe588');
        }
        ctx.globalAlpha = 1;
    }

    drawBee(state, time) {
        const ctx = this.ctx, bee = state.bee;
        const bob = Math.sin(time * 4) * 2;
        ellipse(ctx, bee.x + 3, bee.y + 17, 22, 10, 0, 'rgba(31,52,29,.24)');
        if (bee.abilityTime > 0) {
            if (state.ability === 'shield') {
                const glow = ctx.createRadialGradient(bee.x - 12, bee.y - 12, 1, bee.x, bee.y, 43);
                glow.addColorStop(0, 'rgba(237,255,255,.12)'); glow.addColorStop(0.85, 'rgba(174,235,244,.1)'); glow.addColorStop(1, 'rgba(209,248,244,.6)');
                circle(ctx, bee.x, bee.y, 43, glow);
                ctx.beginPath(); ctx.arc(bee.x - 4, bee.y - 5, 31, Math.PI * 1.08, Math.PI * 1.55); ctx.strokeStyle = '#e7ffef'; ctx.lineWidth = 3; ctx.stroke();
            } else if (state.ability === 'magnet') {
                ctx.strokeStyle = 'rgba(255,231,148,.48)'; ctx.lineWidth = 2; ctx.setLineDash([4, 8]);
                ctx.beginPath(); ctx.arc(bee.x, bee.y, 100 + Math.sin(time * 5) * 6, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
            } else {
                for (let i = 0; i < 4; i++) ellipse(ctx, bee.x - Math.cos(bee.angle) * (30 + i * 14), bee.y - Math.sin(bee.angle) * (30 + i * 14), 15 - i * 3, 5 - i * 0.6, bee.angle, `rgba(255,235,157,${0.22 - i * 0.04})`);
            }
        }
        ctx.save(); ctx.translate(bee.x, bee.y - 6 + bob); ctx.rotate(bee.angle || 0);
        if (bee.invulnerable > 0) ctx.globalAlpha = Math.sin(time * 22) > 0 ? 0.55 : 1;
        // Legs and antennae are visible under a softly shaded striped abdomen.
        ctx.strokeStyle = '#58452d'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        for (const side of [-1, 1]) {
            for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-10 + i * 8, side * 8); ctx.lineTo(-16 + i * 9, side * 16); ctx.lineTo(-10 + i * 8, side * 19); ctx.stroke(); }
        }
        // Fast translucent wingbeats, expressed as shapes rather than motion blur.
        const flap = 0.7 + Math.abs(Math.sin(time * 31)) * 0.4;
        for (const side of [-1, 1]) {
            ellipse(ctx, -4, side * 17, 15 * flap, 8, side * 0.7, 'rgba(230,248,237,.78)');
            ellipse(ctx, -10, side * 12, 10 * flap, 5, side * 0.8, 'rgba(239,250,240,.5)');
            ctx.strokeStyle = 'rgba(172,203,181,.65)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(2, side * 8); ctx.lineTo(-9, side * 22); ctx.stroke();
        }
        ellipse(ctx, -3, 0, 22, 14, 0, '#5c462d');
        ellipse(ctx, -4, -1, 21, 13, 0, '#edbc46');
        ctx.save(); ctx.beginPath(); ctx.ellipse(-4, -1, 21, 13, 0, 0, TAU); ctx.clip();
        ctx.fillStyle = '#604930'; ctx.fillRect(-18, -16, 6, 32); ctx.fillRect(-5, -16, 7, 32);
        ellipse(ctx, -5, -7, 17, 4, 0, 'rgba(255,231,134,.3)'); ctx.restore();
        circle(ctx, 16, -1, 12, '#edbe52');
        ellipse(ctx, 16, -5, 8, 5, 0, '#f7d270');
        circle(ctx, 22, -6, 3.1, '#423b30'); circle(ctx, 22, 4, 3.1, '#423b30');
        circle(ctx, 23, -7, 1, '#fff5d2'); circle(ctx, 23, 3, 1, '#fff5d2');
        circle(ctx, 25, -1, 2.2, '#d29149');
        ctx.strokeStyle = '#554831'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(19, -11); ctx.quadraticCurveTo(24, -20, 29, -18); ctx.moveTo(19, 10); ctx.quadraticCurveTo(24, 19, 29, 17); ctx.stroke();
        circle(ctx, 29, -18, 2, '#554831'); circle(ctx, 29, 17, 2, '#554831');
        if (state.carried > 0) {
            circle(ctx, -1, -15, 3 + state.carried / state.capacity * 2.5, '#f7d97b');
            circle(ctx, -1, 15, 3 + state.carried / state.capacity * 2.5, '#f7d97b');
        }
        ctx.restore();
    }

    drawAtmosphere(time, theme) {
        const ctx = this.ctx;
        const light = ctx.createLinearGradient(0, 0, this.viewWidth, this.viewHeight);
        light.addColorStop(0, 'rgba(244,230,170,.12)'); light.addColorStop(0.6, 'rgba(238,236,183,0)'); light.addColorStop(1, 'rgba(23,63,44,.1)');
        ctx.fillStyle = light; ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
        if (theme === 'forest') {
            ctx.fillStyle = 'rgba(238,235,170,.035)'; ctx.beginPath(); ctx.moveTo(180, 0); ctx.lineTo(310, 0); ctx.lineTo(800, 650); ctx.lineTo(470, 650); ctx.closePath(); ctx.fill();
        }
        // An airy edge treatment draws the eye into the scene.
        const shade = ctx.createRadialGradient(550, 300, 270, 550, 320, 680);
        shade.addColorStop(0, 'rgba(18,46,32,0)'); shade.addColorStop(1, 'rgba(18,46,32,.2)');
        ctx.fillStyle = shade; ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
    }

    drawWaypoints(world, state) {
        const targets = [];
        const full = state.carried >= state.capacity;
        if (state.carried > 0) targets.push({ ...world.hive, label: full ? 'BASKETS FULL · HIVE' : 'HIVE', color: '#f5dc94' });
        if (!full) {
            const species = state.sequence[state.sequenceIndex];
            const candidate = world.flowers.filter(f => f.type === species && f.ready && f.id !== state.lastSequenceFlower)
                .sort((a, b) => Math.hypot(a.x - state.bee.x, a.y - state.bee.y) - Math.hypot(b.x - state.bee.x, b.y - state.bee.y))[0];
            if (candidate) targets.push({ ...candidate, label: FLOWERS[species]?.name || 'NEXT FLOWER', color: FLOWERS[species]?.color || '#fff4d8' });
        }
        for (const target of targets) {
            const p = this.project(target.x, target.y);
            if (p.x > 60 && p.x < this.viewWidth - 60 && p.y > 70 && p.y < this.viewHeight - 75) continue;
            const cx = this.viewWidth / 2, cy = this.viewHeight / 2;
            const dx = p.x - cx, dy = p.y - cy;
            const factor = Math.min((cx - 85) / Math.max(Math.abs(dx), 1), (cy - 60) / Math.max(Math.abs(dy), 1));
            const x = cx + dx * factor, y = cy + dy * factor;
            const ctx = this.ctx, angle = Math.atan2(dy, dx);
            rounded(ctx, x - 70, y - 17, 140, 34, 17, 'rgba(31,67,47,.9)');
            ctx.save(); ctx.translate(x + Math.cos(angle) * 18, y + Math.sin(angle) * 33); ctx.rotate(angle);
            ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-4, -5); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fillStyle = target.color; ctx.fill(); ctx.restore();
            text(ctx, target.label.toUpperCase(), x, y, 9, target.color);
        }
    }

    drawMinimap(world, state) {
        const ctx = this.ctx, w = 158, h = 93;
        // Reserve the lower corner for the DOM ability button at every scale.
        const x = this.viewWidth - w - 20, y = this.viewHeight - h - 130;
        ctx.save(); rounded(ctx, x - 8, y - 25, w + 16, h + 33, 14, 'rgba(30,62,47,.88)');
        text(ctx, 'HABITAT MAP', x + w / 2, y - 11, 8, '#ccdab9');
        rounded(ctx, x, y, w, h, 6, '#607e58');
        const sx = w / world.width, sy = h / world.height;
        ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.clip();
        for (const patch of world.patches || []) circle(ctx, x + patch.x * sx, y + patch.y * sy, patch.r * sx, patch.restored ? '#8fa965' : '#9c9f6b');
        for (const o of world.obstacles || []) circle(ctx, x + o.x * sx, y + o.y * sy, Math.max(2, o.r * sx), '#3b634d');
        for (const hazard of world.hazards || []) circle(ctx, x + hazard.x * sx, y + hazard.y * sy, Math.max(2, hazard.r * sx * 0.6), '#b8997a');
        for (const flower of world.flowers || []) circle(ctx, x + flower.x * sx, y + flower.y * sy, flower.ready ? 2 : 1.1, FLOWERS[flower.type]?.color || '#e8dab0');
        rounded(ctx, x + world.hive.x * sx - 3, y + world.hive.y * sy - 3, 6, 6, 1, '#ffda7b');
        ctx.strokeStyle = 'rgba(235,242,217,.37)'; ctx.lineWidth = 1;
        ctx.strokeRect(x + this.camera.x * sx, y + this.camera.y * sy, this.viewWidth * sx, this.viewHeight * sy);
        circle(ctx, x + state.bee.x * sx, y + state.bee.y * sy, 4, '#fff7c9'); circle(ctx, x + state.bee.x * sx, y + state.bee.y * sy, 1.5, '#7c6843');
        ctx.restore(); ctx.restore();
    }
}
