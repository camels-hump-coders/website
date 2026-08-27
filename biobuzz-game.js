document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('buzzCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const WORLD = { width: 1200, height: 675 };
    const TARGET_DELIVERED = 12;
    const ROUND_TIME = 75;
    const MAX_POLLEN = 3;
    const HIVE_ZONE = { x: 84, y: 374, width: 150, height: 196 };
    const FLOWER_COLORS = ['#f3c72e', '#ef776f', '#fbf4d5', '#72a9d4', '#bd79b8', '#ef9c3e'];
    const FLOWER_POSITIONS = [
        { x: 304, y: 516 },
        { x: 450, y: 432 },
        { x: 600, y: 524 },
        { x: 756, y: 395 },
        { x: 920, y: 511 },
        { x: 1070, y: 433 }
    ];

    const elements = {
        score: document.getElementById('scoreValue'),
        time: document.getElementById('timeValue'),
        progress: document.querySelector('.hive-progress'),
        progressFill: document.getElementById('hiveProgressFill'),
        progressValue: document.getElementById('hiveProgressValue'),
        pollenSlots: Array.from(document.querySelectorAll('#pollenSlots span')),
        pollenContainer: document.getElementById('pollenSlots'),
        status: document.getElementById('gameStatus'),
        startOverlay: document.getElementById('startOverlay'),
        pauseOverlay: document.getElementById('pauseOverlay'),
        endOverlay: document.getElementById('endOverlay'),
        startButton: document.getElementById('startButton'),
        pauseButton: document.getElementById('pauseButton'),
        restartButton: document.getElementById('restartButton'),
        resumeButton: document.getElementById('resumeButton'),
        playAgainButton: document.getElementById('playAgainButton'),
        endEyebrow: document.getElementById('endEyebrow'),
        endTitle: document.getElementById('endTitle'),
        endMessage: document.getElementById('endMessage'),
        finalScore: document.getElementById('finalScore'),
        finalDelivered: document.getElementById('finalDelivered'),
        bestScore: document.getElementById('bestScore')
    };

    const keys = new Set();
    const particles = [];
    const breezeSeeds = Array.from({ length: 54 }, (_, index) => ({
        x: (index * 83) % WORLD.width,
        y: 458 + ((index * 47) % 184),
        lean: ((index % 5) - 2) * 0.035,
        height: 11 + (index % 6) * 4
    }));
    const flowers = FLOWER_POSITIONS.map((position, index) => ({
        ...position,
        color: FLOWER_COLORS[index],
        ready: true,
        cooldown: 0,
        pulse: index * 0.8
    }));
    const hornets = [
        { x: 640, y: 260, vx: 86, vy: 52, phase: 0 },
        { x: 1010, y: 285, vx: -74, vy: 60, phase: 2.4 }
    ];

    let phase = 'ready';
    let animationFrame = 0;
    let previousTime = performance.now();
    let elapsed = 0;
    let pointerTarget = null;
    let statusTimer = 0;
    let hiveContact = false;
    let viewportWidth = WORLD.width;
    let cameraX = 0;
    let state = createState();

    function createState() {
        return {
            score: 0,
            time: ROUND_TIME,
            pollen: 0,
            delivered: 0,
            flowersVisited: 0,
            invulnerable: 0,
            bee: { x: 210, y: 430, vx: 0, vy: 0, angle: 0 }
        };
    }

    function configureCanvas() {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        viewportWidth = window.matchMedia('(max-width: 760px)').matches ? 900 : WORLD.width;
        canvas.width = Math.round(viewportWidth * ratio);
        canvas.height = Math.round(WORLD.height * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function resetWorld() {
        state = createState();
        elapsed = 0;
        statusTimer = 0;
        hiveContact = false;
        pointerTarget = null;
        particles.length = 0;
        keys.clear();
        flowers.forEach((flower, index) => {
            flower.ready = true;
            flower.cooldown = 0;
            flower.pulse = index * 0.8;
        });
        hornets[0] = { x: 640, y: 260, vx: 86, vy: 52, phase: 0 };
        hornets[1] = { x: 1010, y: 285, vx: -74, vy: 60, phase: 2.4 };
        updateDashboard();
        setStatus('Collect pollen from the flowers.');
    }

    function startGame() {
        resetWorld();
        phase = 'playing';
        toggleOverlay(elements.startOverlay, false);
        toggleOverlay(elements.pauseOverlay, false);
        toggleOverlay(elements.endOverlay, false);
        elements.pauseButton.disabled = false;
        elements.pauseButton.setAttribute('aria-label', 'Pause game');
        elements.pauseButton.title = 'Pause';
        elements.pauseButton.innerHTML = '<span aria-hidden="true">&#10074;&#10074;</span>';
        canvas.focus({ preventScroll: true });
        previousTime = performance.now();
    }

    function restartGame() {
        startGame();
    }

    function pauseGame() {
        if (phase !== 'playing') return;
        phase = 'paused';
        keys.clear();
        pointerTarget = null;
        elements.pauseButton.setAttribute('aria-label', 'Resume game');
        elements.pauseButton.title = 'Resume';
        elements.pauseButton.innerHTML = '<span aria-hidden="true">&#9654;</span>';
        toggleOverlay(elements.pauseOverlay, true);
        elements.resumeButton.focus();
    }

    function resumeGame() {
        if (phase !== 'paused') return;
        phase = 'playing';
        elements.pauseButton.setAttribute('aria-label', 'Pause game');
        elements.pauseButton.title = 'Pause';
        elements.pauseButton.innerHTML = '<span aria-hidden="true">&#10074;&#10074;</span>';
        toggleOverlay(elements.pauseOverlay, false);
        previousTime = performance.now();
        canvas.focus({ preventScroll: true });
    }

    function togglePause() {
        if (phase === 'playing') pauseGame();
        else if (phase === 'paused') resumeGame();
    }

    function endGame(won) {
        if (phase === 'ended') return;
        phase = 'ended';
        elements.pauseButton.disabled = true;
        keys.clear();
        pointerTarget = null;

        const best = Math.max(state.score, readBestScore());
        writeBestScore(best);
        elements.endEyebrow.textContent = won ? 'Hive filled' : 'Time is up';
        elements.endTitle.textContent = won ? 'The meadow is buzzing!' : 'Good flight!';
        elements.endMessage.textContent = won
            ? `You delivered ${state.delivered} pollen and helped every corner of the meadow bloom.`
            : `You delivered ${state.delivered} pollen. Fill your basket before returning to the hive for a bigger score.`;
        elements.finalScore.textContent = state.score;
        elements.finalDelivered.textContent = state.delivered;
        elements.bestScore.textContent = best;
        toggleOverlay(elements.endOverlay, true);
        elements.playAgainButton.focus();
    }

    function toggleOverlay(overlay, visible) {
        overlay.classList.toggle('is-visible', visible);
        overlay.setAttribute('aria-hidden', String(!visible));
    }

    function readBestScore() {
        try {
            return Number.parseInt(localStorage.getItem('biobuzz-best-score') || '0', 10) || 0;
        } catch (error) {
            return 0;
        }
    }

    function writeBestScore(score) {
        try {
            localStorage.setItem('biobuzz-best-score', String(score));
        } catch (error) {
            // The game remains playable when browser storage is unavailable.
        }
    }

    function setStatus(message, duration = 2.4) {
        elements.status.textContent = message;
        statusTimer = duration;
    }

    function updateDashboard() {
        const roundedTime = Math.max(0, Math.ceil(state.time));
        elements.score.textContent = state.score;
        elements.time.textContent = roundedTime;
        elements.time.parentElement.classList.toggle('is-urgent', roundedTime <= 10);
        elements.progress.setAttribute('aria-valuenow', String(Math.min(state.delivered, TARGET_DELIVERED)));
        elements.progressFill.style.width = `${Math.min(100, (state.delivered / TARGET_DELIVERED) * 100)}%`;
        elements.progressValue.textContent = `${Math.min(state.delivered, TARGET_DELIVERED)} / ${TARGET_DELIVERED}`;
        elements.pollenContainer.setAttribute('aria-label', `${state.pollen} of ${MAX_POLLEN} pollen collected`);
        elements.pollenSlots.forEach((slot, index) => {
            slot.classList.toggle('is-filled', index < state.pollen);
        });
    }

    function update(dt) {
        if (phase !== 'playing') return;

        elapsed += dt;
        state.time -= dt;
        state.invulnerable = Math.max(0, state.invulnerable - dt);
        statusTimer = Math.max(0, statusTimer - dt);
        if (statusTimer === 0 && elements.status.textContent !== 'Collect pollen from the flowers.') {
            elements.status.textContent = state.pollen === MAX_POLLEN
                ? 'Pollen basket full. Return to the hive!'
                : 'Collect pollen from the flowers.';
        }

        updateBee(dt);
        updateFlowers(dt);
        updateHornets(dt);
        updateParticles(dt);
        checkFlowerCollisions();
        checkHiveCollision();
        checkHornetCollisions();
        updateDashboard();

        if (state.delivered >= TARGET_DELIVERED) endGame(true);
        else if (state.time <= 0) {
            state.time = 0;
            updateDashboard();
            endGame(false);
        }
    }

    function updateBee(dt) {
        const bee = state.bee;
        let inputX = 0;
        let inputY = 0;

        if (keys.has('left')) inputX -= 1;
        if (keys.has('right')) inputX += 1;
        if (keys.has('up')) inputY -= 1;
        if (keys.has('down')) inputY += 1;

        if (pointerTarget) {
            const dx = pointerTarget.x - bee.x;
            const dy = pointerTarget.y - bee.y;
            const distance = Math.hypot(dx, dy);
            if (distance > 18) {
                inputX = dx / distance;
                inputY = dy / distance;
            } else {
                pointerTarget = null;
            }
        }

        if (inputX || inputY) {
            const length = Math.hypot(inputX, inputY) || 1;
            inputX /= length;
            inputY /= length;
            const acceleration = 720;
            bee.vx += inputX * acceleration * dt;
            bee.vy += inputY * acceleration * dt;
        }

        const drag = Math.pow(0.0017, dt);
        bee.vx *= drag;
        bee.vy *= drag;
        const maxSpeed = 285;
        const speed = Math.hypot(bee.vx, bee.vy);
        if (speed > maxSpeed) {
            bee.vx = (bee.vx / speed) * maxSpeed;
            bee.vy = (bee.vy / speed) * maxSpeed;
        }

        bee.x += bee.vx * dt;
        bee.y += bee.vy * dt;
        bee.x = clamp(bee.x, 36, WORLD.width - 36);
        bee.y = clamp(bee.y, 92, WORLD.height - 66);

        if (Math.abs(bee.vx) > 12) {
            const facing = bee.vx < 0 ? Math.PI : 0;
            bee.angle += shortestAngle(bee.angle, facing) * Math.min(1, dt * 8);
        }
    }

    function updateFlowers(dt) {
        flowers.forEach((flower) => {
            flower.pulse += dt;
            if (!flower.ready) {
                flower.cooldown -= dt;
                if (flower.cooldown <= 0) {
                    flower.ready = true;
                    flower.cooldown = 0;
                    createBurst(flower.x, flower.y - 45, flower.color, 8, 42);
                }
            }
        });
    }

    function updateHornets(dt) {
        hornets.forEach((hornet, index) => {
            hornet.phase += dt * (1.2 + index * 0.15);
            hornet.x += hornet.vx * dt;
            hornet.y += hornet.vy * dt + Math.sin(hornet.phase * 2.2) * 22 * dt;
            if (hornet.x < 430 || hornet.x > WORLD.width - 42) hornet.vx *= -1;
            if (hornet.y < 135 || hornet.y > 390) hornet.vy *= -1;
            hornet.x = clamp(hornet.x, 430, WORLD.width - 42);
            hornet.y = clamp(hornet.y, 135, 390);
        });
    }

    function updateParticles(dt) {
        for (let index = particles.length - 1; index >= 0; index -= 1) {
            const particle = particles[index];
            particle.life -= dt;
            if (particle.life <= 0) {
                particles.splice(index, 1);
                continue;
            }
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            particle.vy += particle.gravity * dt;
        }
    }

    function checkFlowerCollisions() {
        if (state.pollen >= MAX_POLLEN) return;
        flowers.forEach((flower) => {
            if (!flower.ready) return;
            if (distance(state.bee.x, state.bee.y, flower.x, flower.y - 43) < 47) {
                flower.ready = false;
                flower.cooldown = 5.5 + Math.random() * 2;
                state.pollen += 1;
                state.flowersVisited += 1;
                state.score += 10;
                createBurst(flower.x, flower.y - 42, flower.color, 15, 95);
                setStatus(state.pollen === MAX_POLLEN ? 'Pollen basket full. Return to the hive!' : `${state.pollen} pollen collected.`);
            }
        });
    }

    function checkHiveCollision() {
        const inside = state.bee.x > HIVE_ZONE.x && state.bee.x < HIVE_ZONE.x + HIVE_ZONE.width
            && state.bee.y > HIVE_ZONE.y && state.bee.y < HIVE_ZONE.y + HIVE_ZONE.height;

        if (inside && !hiveContact && state.pollen > 0) {
            const deliveredNow = state.pollen;
            const fullBasketBonus = deliveredNow === MAX_POLLEN ? 30 : 0;
            state.delivered += deliveredNow;
            state.score += deliveredNow * 30 + fullBasketBonus;
            state.pollen = 0;
            createBurst(170, 485, '#f2c230', 24, 120);
            setStatus(fullBasketBonus ? 'Full basket delivered. Bonus points!' : `${deliveredNow} pollen delivered to the hive.`);
        }
        hiveContact = inside;
    }

    function checkHornetCollisions() {
        if (state.invulnerable > 0) return;
        hornets.forEach((hornet) => {
            if (state.invulnerable > 0) return;
            if (distance(state.bee.x, state.bee.y, hornet.x, hornet.y) < 38) {
                state.invulnerable = 1.7;
                state.time = Math.max(0, state.time - 4);
                state.score = Math.max(0, state.score - 15);
                if (state.pollen > 0) state.pollen -= 1;
                const dx = state.bee.x - hornet.x;
                const dy = state.bee.y - hornet.y;
                const length = Math.hypot(dx, dy) || 1;
                state.bee.vx = (dx / length) * 330;
                state.bee.vy = (dy / length) * 330;
                createBurst(state.bee.x, state.bee.y, '#c94b35', 14, 130);
                setStatus('Hornet hit! Four seconds lost.');
            }
        });
    }

    function createBurst(x, y, color, count, speed) {
        for (let index = 0; index < count; index += 1) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = speed * (0.35 + Math.random() * 0.65);
            particles.push({
                x,
                y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                gravity: 28,
                color,
                size: 2 + Math.random() * 4,
                life: 0.45 + Math.random() * 0.55,
                maxLife: 1
            });
        }
    }

    function draw() {
        cameraX = clamp(state.bee.x - viewportWidth / 2, 0, WORLD.width - viewportWidth);
        ctx.clearRect(0, 0, viewportWidth, WORLD.height);
        ctx.save();
        ctx.translate(-cameraX, 0);
        drawSky();
        drawLandscape();
        drawHive();
        flowers.forEach(drawFlower);
        hornets.forEach(drawHornet);
        drawParticles();
        drawBee();
        if (phase === 'ready') drawReadyBeeTrail();
        ctx.restore();
    }

    function drawSky() {
        const sky = ctx.createLinearGradient(0, 0, 0, WORLD.height);
        sky.addColorStop(0, '#69b9dc');
        sky.addColorStop(0.56, '#c9e9e5');
        sky.addColorStop(1, '#f3e9ad');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, WORLD.width, WORLD.height);

        ctx.save();
        ctx.fillStyle = '#ffe66b';
        ctx.beginPath();
        ctx.arc(1050, 105, 46, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 230, 107, 0.38)';
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(1050, 105, 59, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        drawCloud(165 + Math.sin(elapsed * 0.08) * 14, 108, 1.05);
        drawCloud(715 + Math.sin(elapsed * 0.06 + 2) * 18, 142, 0.78);
        drawCloud(975 + Math.sin(elapsed * 0.05 + 4) * 12, 225, 0.55);
    }

    function drawCloud(x, y, scale) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.fillStyle = 'rgba(255, 255, 248, 0.78)';
        ctx.beginPath();
        ctx.ellipse(0, 12, 58, 22, 0, 0, Math.PI * 2);
        ctx.ellipse(-28, 0, 28, 25, 0, 0, Math.PI * 2);
        ctx.ellipse(8, -9, 36, 33, 0, 0, Math.PI * 2);
        ctx.ellipse(39, 5, 27, 24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawLandscape() {
        ctx.fillStyle = '#76995a';
        ctx.beginPath();
        ctx.moveTo(0, 430);
        ctx.quadraticCurveTo(190, 286, 405, 419);
        ctx.quadraticCurveTo(640, 270, 862, 425);
        ctx.quadraticCurveTo(1050, 310, 1200, 410);
        ctx.lineTo(1200, 675);
        ctx.lineTo(0, 675);
        ctx.closePath();
        ctx.fill();

        const meadow = ctx.createLinearGradient(0, 420, 0, 675);
        meadow.addColorStop(0, '#8eb761');
        meadow.addColorStop(0.55, '#5f8f44');
        meadow.addColorStop(1, '#426f35');
        ctx.fillStyle = meadow;
        ctx.beginPath();
        ctx.moveTo(0, 493);
        ctx.quadraticCurveTo(210, 425, 410, 505);
        ctx.quadraticCurveTo(670, 402, 890, 498);
        ctx.quadraticCurveTo(1050, 435, 1200, 485);
        ctx.lineTo(1200, 675);
        ctx.lineTo(0, 675);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(32, 91, 41, 0.48)';
        ctx.lineWidth = 2;
        breezeSeeds.forEach((blade) => {
            const sway = Math.sin(elapsed * 1.8 + blade.x * 0.02) * 4;
            ctx.beginPath();
            ctx.moveTo(blade.x, blade.y);
            ctx.quadraticCurveTo(blade.x + sway, blade.y - blade.height * 0.58, blade.x + sway + blade.lean * 20, blade.y - blade.height);
            ctx.stroke();
        });
    }

    function drawHive() {
        ctx.save();
        ctx.translate(152, 486);

        ctx.fillStyle = '#6d4822';
        ctx.fillRect(-74, 72, 148, 11);
        ctx.fillRect(-58, 83, 10, 46);
        ctx.fillRect(48, 83, 10, 46);

        ctx.fillStyle = 'rgba(39, 61, 28, 0.25)';
        ctx.beginPath();
        ctx.ellipse(0, 127, 102, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#d79b2c';
        roundRectPath(ctx, -62, -92, 124, 166, 10);
        ctx.fill();
        ctx.strokeStyle = '#7a531d';
        ctx.lineWidth = 5;
        ctx.stroke();

        for (let y = -70; y <= 45; y += 27) {
            const bodyWidth = 108 - Math.abs(y + 10) * 0.18;
            ctx.fillStyle = y % 54 === 0 ? '#e3ac36' : '#c98923';
            roundRectPath(ctx, -bodyWidth / 2, y, bodyWidth, 19, 8);
            ctx.fill();
            ctx.strokeStyle = 'rgba(105, 66, 19, 0.56)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.fillStyle = '#3a2413';
        ctx.beginPath();
        ctx.ellipse(0, 43, 28, 34, 0, Math.PI, 0);
        ctx.lineTo(28, 58);
        ctx.lineTo(-28, 58);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#8d5d1d';
        ctx.fillRect(-38, 57, 76, 9);

        ctx.fillStyle = '#543515';
        ctx.fillRect(-72, -107, 144, 14);
        ctx.fillStyle = '#7c5522';
        ctx.fillRect(-78, -115, 156, 10);
        ctx.restore();

        ctx.fillStyle = '#405b2e';
        ctx.font = '700 17px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('HIVE', 152, 637);
    }

    function drawFlower(flower) {
        const bloomY = flower.y - 44;
        const sway = Math.sin(flower.pulse * 1.8) * 3;
        const bloomScale = flower.ready ? 1 + Math.sin(flower.pulse * 2.4) * 0.035 : 0.74;

        ctx.save();
        ctx.strokeStyle = '#3b742f';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(flower.x, flower.y + 30);
        ctx.quadraticCurveTo(flower.x - sway, flower.y - 4, flower.x + sway, bloomY);
        ctx.stroke();

        ctx.fillStyle = '#4f8a3a';
        ctx.beginPath();
        ctx.ellipse(flower.x - 13, flower.y - 3, 19, 8, -0.45, 0, Math.PI * 2);
        ctx.ellipse(flower.x + 14, flower.y + 12, 18, 7, 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(flower.x + sway, bloomY);
        ctx.scale(bloomScale, bloomScale);
        for (let index = 0; index < 8; index += 1) {
            const angle = (Math.PI * 2 * index) / 8;
            ctx.save();
            ctx.rotate(angle);
            ctx.fillStyle = flower.ready ? flower.color : '#ad9e74';
            ctx.beginPath();
            ctx.ellipse(0, -25, 12, 22, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        ctx.fillStyle = flower.ready ? '#8f5c17' : '#766a4d';
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        if (flower.ready) {
            ctx.fillStyle = '#f8d85b';
            for (let index = 0; index < 7; index += 1) {
                const angle = index * 2.3;
                ctx.beginPath();
                ctx.arc(Math.cos(angle) * 9, Math.sin(angle) * 9, 2.3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    function drawBee() {
        const bee = state.bee;
        if (state.invulnerable > 0 && Math.floor(state.invulnerable * 12) % 2 === 0) return;

        ctx.save();
        ctx.translate(bee.x, bee.y + Math.sin(elapsed * 7) * 2.3);
        ctx.rotate(bee.angle);

        const wingLift = 0.48 + Math.abs(Math.sin(elapsed * 29)) * 0.52;
        ctx.fillStyle = 'rgba(231, 246, 244, 0.72)';
        ctx.strokeStyle = 'rgba(61, 86, 76, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(-7, -16, 23, 10 * wingLift, -0.45, 0, Math.PI * 2);
        ctx.ellipse(11, -16, 23, 10 * wingLift, 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#d99d1f';
        ctx.beginPath();
        ctx.ellipse(0, 0, 35, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.clip();
        ctx.fillStyle = '#2e271f';
        ctx.fillRect(-23, -24, 9, 48);
        ctx.fillRect(-3, -24, 9, 48);
        ctx.fillRect(17, -24, 9, 48);
        ctx.restore();
        ctx.strokeStyle = '#3d2c19';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#3c3024';
        ctx.beginPath();
        ctx.arc(31, -1, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e9d69a';
        ctx.beginPath();
        ctx.arc(37, -6, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#15120f';
        ctx.beginPath();
        ctx.arc(38, -6, 1.7, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#30261d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(37, -13);
        ctx.quadraticCurveTo(47, -25, 53, -19);
        ctx.moveTo(30, -15);
        ctx.quadraticCurveTo(34, -29, 42, -25);
        ctx.stroke();

        for (let index = 0; index < state.pollen; index += 1) {
            ctx.fillStyle = '#f3c72e';
            ctx.beginPath();
            ctx.arc(-13 + index * 12, 18, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#a36f12';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawHornet(hornet) {
        const facingLeft = hornet.vx < 0;
        ctx.save();
        ctx.translate(hornet.x, hornet.y);
        ctx.scale(facingLeft ? -1 : 1, 1);

        const flap = 0.35 + Math.abs(Math.sin(elapsed * 24 + hornet.phase)) * 0.65;
        ctx.fillStyle = 'rgba(220, 235, 229, 0.67)';
        ctx.beginPath();
        ctx.ellipse(-5, -14, 19, 7 * flap, -0.4, 0, Math.PI * 2);
        ctx.ellipse(12, -15, 17, 7 * flap, 0.45, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#b64a26';
        ctx.beginPath();
        ctx.ellipse(0, 0, 29, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.clip();
        ctx.fillStyle = '#2a201b';
        ctx.fillRect(-17, -18, 8, 36);
        ctx.fillRect(2, -18, 8, 36);
        ctx.fillRect(20, -18, 7, 36);
        ctx.restore();

        ctx.fillStyle = '#2b211c';
        ctx.beginPath();
        ctx.arc(25, -1, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#db5c3d';
        ctx.beginPath();
        ctx.arc(30, -5, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawParticles() {
        particles.forEach((particle) => {
            ctx.save();
            ctx.globalAlpha = Math.min(1, particle.life * 1.8);
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    function drawReadyBeeTrail() {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 3;
        ctx.setLineDash([7, 12]);
        ctx.beginPath();
        ctx.moveTo(246, 425);
        ctx.quadraticCurveTo(275, 390, 305, 445);
        ctx.stroke();
        ctx.restore();
    }

    function frame(now) {
        const dt = Math.min((now - previousTime) / 1000, 0.035);
        previousTime = now;
        update(dt);
        draw();
        animationFrame = requestAnimationFrame(frame);
    }

    function directionFromKey(key) {
        const normalized = key.toLowerCase();
        if (normalized === 'arrowup' || normalized === 'w') return 'up';
        if (normalized === 'arrowdown' || normalized === 's') return 'down';
        if (normalized === 'arrowleft' || normalized === 'a') return 'left';
        if (normalized === 'arrowright' || normalized === 'd') return 'right';
        return null;
    }

    function canvasPoint(event) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: cameraX + ((event.clientX - rect.left) / rect.width) * viewportWidth,
            y: ((event.clientY - rect.top) / rect.height) * WORLD.height
        };
    }

    function shortestAngle(current, target) {
        return Math.atan2(Math.sin(target - current), Math.cos(target - current));
    }

    function distance(x1, y1, x2, y2) {
        return Math.hypot(x2 - x1, y2 - y1);
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function roundRectPath(context, x, y, width, height, radius) {
        const r = Math.min(radius, width / 2, height / 2);
        context.beginPath();
        context.moveTo(x + r, y);
        context.arcTo(x + width, y, x + width, y + height, r);
        context.arcTo(x + width, y + height, x, y + height, r);
        context.arcTo(x, y + height, x, y, r);
        context.arcTo(x, y, x + width, y, r);
        context.closePath();
    }

    window.addEventListener('keydown', (event) => {
        const direction = directionFromKey(event.key);
        if (direction) {
            event.preventDefault();
            keys.add(direction);
            pointerTarget = null;
        } else if (event.key === 'Escape' || event.key.toLowerCase() === 'p') {
            event.preventDefault();
            togglePause();
        } else if ((event.key === 'Enter' || event.key === ' ') && phase === 'ready') {
            event.preventDefault();
            startGame();
        }
    });

    window.addEventListener('keyup', (event) => {
        const direction = directionFromKey(event.key);
        if (direction) {
            event.preventDefault();
            keys.delete(direction);
        }
    });

    canvas.addEventListener('pointerdown', (event) => {
        if (phase !== 'playing') return;
        pointerTarget = canvasPoint(event);
        canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener('pointermove', (event) => {
        if (phase === 'playing' && canvas.hasPointerCapture(event.pointerId)) {
            pointerTarget = canvasPoint(event);
        }
    });

    canvas.addEventListener('pointerup', (event) => {
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    });

    document.querySelectorAll('[data-direction]').forEach((button) => {
        const direction = button.dataset.direction;
        const press = (event) => {
            event.preventDefault();
            keys.add(direction);
            pointerTarget = null;
            button.classList.add('is-pressed');
            if (button.setPointerCapture && event.pointerId !== undefined) button.setPointerCapture(event.pointerId);
        };
        const release = (event) => {
            event.preventDefault();
            keys.delete(direction);
            button.classList.remove('is-pressed');
        };
        button.addEventListener('pointerdown', press);
        button.addEventListener('pointerup', release);
        button.addEventListener('pointercancel', release);
        button.addEventListener('lostpointercapture', release);
    });

    elements.startButton.addEventListener('click', startGame);
    elements.restartButton.addEventListener('click', restartGame);
    elements.pauseButton.addEventListener('click', togglePause);
    elements.resumeButton.addEventListener('click', resumeGame);
    elements.playAgainButton.addEventListener('click', startGame);

    document.addEventListener('visibilitychange', () => {
        if (document.hidden && phase === 'playing') pauseGame();
    });

    window.addEventListener('resize', configureCanvas);
    configureCanvas();
    resetWorld();
    draw();
    animationFrame = requestAnimationFrame(frame);

    window.addEventListener('beforeunload', () => cancelAnimationFrame(animationFrame));
});
