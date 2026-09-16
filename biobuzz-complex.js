import { FLOWERS, LEVELS, DISCOVERIES, ABILITIES, BADGES, SOURCES } from './biobuzz-complex-data.js';
import { BioBuzzGame } from './biobuzz-complex-core.js';
import { Renderer } from './biobuzz-complex-renderer.js';
import { BioBuzzAudio } from './biobuzz-complex-audio.js';
import { SAVE_KEY, defaultSave, normalizeSave, highestUnlocked, recordResult } from './biobuzz-complex-save.js';

const $ = id => document.getElementById(id);
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const formatTime = seconds => {
    const total = Math.ceil(Math.max(0, seconds));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};
const elements = Object.fromEntries(['gameApp','worldCanvas','gameHud','levelName','scoreValue','healthValue','pollenValue','timeValue','deliveryValue','restorationValue','abilityButton','abilityLabel','abilityCooldown','pauseButton','objectiveText','sequenceSteps','objectiveProgress','hintText','discoveryToast','discoveryTitle','discoveryFact','statusToast','menuOverlay','menuPanel'].map(id => [id, $(id)]));
let storageAvailable = true;
let save = defaultSave();
try {
    const raw = localStorage.getItem(SAVE_KEY);
    try { save = normalizeSave(raw ? JSON.parse(raw) : null); }
    catch { save = defaultSave(); }
    if (!raw) save.settings.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
} catch { storageAvailable = false; }
elements.gameApp.dataset.reducedMotion = String(save.settings.reducedMotion);
const audio = new BioBuzzAudio();
audio.configure(save.settings);
const renderer = new Renderer(elements.worldCanvas);
const keys = new Set();
const touchKeys = new Set();
let game = makeGame(0), screen = 'home', lastTime = performance.now(), hudTimer = 0;
let discoveryUntil = 0, statusUntil = 0, result = null, lastTrail = '';
let activeRun = false;
game.state.mode = 'menu';

function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }
    catch { storageAvailable = false; }
}
function makeGame(id) {
    return new BioBuzzGame(LEVELS[id], { ability: save.ability, capacity: 6 + save.capacityLevel * 2, reducedMotion: save.settings.reducedMotion, onEvent: handleGameEvent });
}
function button(label, action, className = 'secondary-button', extra = '') {
    return `<button type="button" class="${className}" data-action="${action}" ${extra}>${label}</button>`;
}
function saveNote() {
    return `<p class="save-note">${storageAvailable ? 'Your discoveries, upgrades, and best scores are saved on this browser.' : 'Browser storage is unavailable. You can still play; progress lasts for this visit.'}</p>`;
}
function panelHeading(eyebrow, title, description = '') {
    return `<div class="menu-header">${button('← Back', 'back', 'back-button')}<div><p class="menu-eyebrow">${eyebrow}</p><h2>${title}</h2>${description ? `<p class="menu-subtitle">${description}</p>` : ''}</div></div>`;
}
function award(id) {
    if (save.badges.includes(id)) return;
    const badge = BADGES.find(b => b.id === id);
    if (!badge) return;
    save.badges.push(id);
    status(`Badge earned: ${badge.name}`);
    persist();
}
function discover(id) {
    if (save.discoveries.includes(id)) return;
    const entry = DISCOVERIES.find(d => d.id === id);
    if (!entry) return;
    save.discoveries.push(id);
    elements.discoveryTitle.textContent = entry.name;
    elements.discoveryFact.textContent = entry.fact;
    elements.discoveryToast.hidden = false;
    discoveryUntil = performance.now() + 8500;
    audio.play('discover');
    if (Object.keys(FLOWERS).every(id => save.discoveries.includes(id))) award('botanist');
    persist();
}
function status(text) {
    elements.statusToast.textContent = text;
    elements.statusToast.hidden = false;
    statusUntil = performance.now() + 3800;
}
function handleGameEvent(name, detail) {
    if (name === 'discover') discover(detail.id);
    if (name === 'collect') audio.play('pollen');
    if (name === 'pollinate') { audio.play('pollinate'); status(`${FLOWERS[detail.type].name} pollinated. A little pollen goes a long way!`); }
    if (name === 'restore') { audio.play('complete'); status('Habitat restored! Watch the landscape come back into bloom.'); }
    if (name === 'hint') status(detail.text);
    if (name === 'ability') { audio.play('ability'); status(`${detail.name} activated`); }
    if (name === 'damage') {
        audio.play('damage');
        const causes = { rain: 'Heavy rain makes flying difficult.', spider: 'Watch the spider webs!', bird: 'Give birds room to fly.', pesticide: 'The spray zone is active—wait for it to clear.' };
        status(`${causes[detail.type] || 'Careful out there!'} Deliver pollen to recover a heart.`);
    }
    if (name === 'deliver') {
        audio.play('deposit');
        save.deliveries += detail.count;
        award('first_delivery');
        status(`+${detail.count * 30} · ${detail.count} pollen delivered. Your hive restores a heart.`);
        persist();
    }
    if (name === 'finish') finishFlight(detail);
    updateHud();
}

function begin(id) {
    id = Number(id);
    if (!Number.isInteger(id) || id < 0 || id > highestUnlocked(save)) return;
    audio.unlock();
    game = makeGame(id);
    activeRun = true;
    result = null;
    keys.clear(); touchKeys.clear();
    lastTrail = '';
    elements.discoveryToast.hidden = true;
    elements.statusToast.hidden = true;
    closeMenu();
    status(id === 0 ? 'Fly into a clover to collect pollen. Then visit another clover. Follow the glowing flowers!' : 'Follow your flower trail, deliver pollen, and restore this habitat.');
    if (id === 1) discover('bumblebee');
    if (id === 2) discover('solitary');
    updateHud();
}
function closeMenu() {
    screen = '';
    elements.menuOverlay.hidden = true;
    elements.gameApp.dataset.mode = 'playing';
    game.state.mode = 'playing';
    keys.clear(); touchKeys.clear();
    audio.setPlaying(true);
    elements.worldCanvas.focus({ preventScroll: true });
    lastTime = performance.now();
}
function pause() {
    if (game.state.mode !== 'playing') return;
    game.state.mode = 'paused';
    showMenu('pause');
}
function showMenu(next) {
    if (game.state.mode === 'playing') game.state.mode = 'paused';
    keys.clear(); touchKeys.clear();
    audio.setPlaying(false);
    audio.setMoving(false);
    elements.discoveryToast.hidden = true;
    elements.statusToast.hidden = true;
    elements.menuOverlay.hidden = false;
    elements.gameApp.dataset.mode = next === 'pause' ? 'paused' : 'menu';
    screen = next;
    elements.menuPanel.dataset.screen = next;
    elements.menuPanel.innerHTML = renderMenu(next);
    elements.menuOverlay.setAttribute('aria-label', { home: 'BioBuzz main menu', levels: 'Choose a landscape', abilities: 'Bee and abilities', guide: 'Field guide', badges: 'Badges', settings: 'Settings', pause: 'Game paused', result: 'Flight results', leave: 'Leave flight' }[next] || 'BioBuzz menu');
    elements.menuPanel.scrollTop = 0;
    requestAnimationFrame(() => elements.menuPanel.querySelector('button:not(:disabled),a,input')?.focus({ preventScroll: true }));
}
function goHome() {
    activeRun = false;
    game.state.mode = 'menu';
    showMenu('home');
}
function finishFlight(detail) {
    activeRun = false;
    const reward = recordResult(save, game);
    if (detail.won) {
        award('first_level');
        if (game.state.damageTaken === 0) award('untouched');
        if (game.state.time >= game.level.time / 2) award('swift');
        if (save.completed.length === LEVELS.length) award('guardian');
        if (game.level.id === 4 && game.state.restored >= 3) award('restorer');
        audio.play('complete');
    }
    result = { ...detail, reward };
    persist();
    showMenu('result');
}

function renderMenu(name) {
    if (name === 'home') {
        const next = highestUnlocked(save);
        return `<div class="menu-home"><div class="menu-home__intro"><p class="menu-eyebrow">THE POLLINATOR ADVENTURE</p><h1 class="menu-title">Bio<span>Buzz</span><span class="title-dot">.</span></h1><h2 class="menu-tagline">Small wings.<br>Wild possibilities.</h2><p class="menu-subtitle">Explore five living landscapes. Follow the flowers. Bring the world back into bloom.</p><div class="menu-footer"><span class="tag">5 landscapes</span><span class="tag">6 wildflowers</span><span class="tag">One little bee</span></div></div><div class="menu-home__play"><div class="menu-hero-art" aria-hidden="true"><span class="hero-flower">✿</span><span class="hero-flower">✿</span><span class="hero-spark">✦</span></div><div class="menu-actions">${button(save.completed.length ? 'Continue adventure ↗' : 'Take flight ↗', 'play', 'primary-button', `data-level="${next}"`)}${button('Choose a landscape', 'levels')}</div><div class="menu-links">${button('Field guide', 'guide', 'text-button')}${button('Bee & abilities', 'abilities', 'text-button')}${button('Badges', 'badges', 'text-button')}${button('Settings', 'settings', 'text-button')}</div><p class="control-summary"><kbd>WASD</kbd> / <kbd>↑↓←→</kbd> fly &nbsp; <kbd>Space</kbd> ability</p></div></div>${saveNote()}`;
    }
    if (name === 'levels') {
        const max = highestUnlocked(save);
        return `${panelHeading('YOUR NEXT EXPEDITION', 'A world worth exploring', 'Restore each landscape to open the next. Replay any unlocked area to improve your score.')}<div class="card-grid level-grid">${LEVELS.map(l => `<button type="button" class="level-card ${l.id > max ? 'is-locked' : ''}" data-action="play" data-level="${l.id}" ${l.id > max ? 'disabled' : ''}><span class="landscape-preview landscape-preview--${l.theme}" aria-hidden="true"><i></i><b>${['✿','❋','♣','≋','✧'][l.id]}</b></span><span class="card-label">${String(l.id + 1).padStart(2, '0')} / ${l.id > max ? 'LOCKED' : save.completed.includes(l.id) ? 'RESTORED ✓' : 'READY TO EXPLORE'}</span><span class="card-title">${l.name}</span><span class="card-description">${l.description}</span><span class="card-meta">${l.target} pollen · ${formatTime(l.time)} · ${save.best[l.id] ? `Best ${save.best[l.id].toLocaleString()}` : l.id > max ? 'Complete the previous area' : 'Set your first score'}</span></button>`).join('')}</div>${saveNote()}`;
    }
    if (name === 'abilities') {
        const cost = save.capacityLevel === 0 ? 12 : 24;
        return `${panelHeading('MAKE YOURSELF AT HOME', 'Bee & abilities', 'Equip one special ability for your next flight. Press Space to use it; it recharges automatically.')}<div class="card-grid">${ABILITIES.map(a => { const locked = save.completed.length < a.unlock; return `<article class="ability-card ${locked ? 'is-locked' : ''} ${save.ability === a.id ? 'is-selected' : ''}"><span class="card-icon">${a.icon}</span><h3 class="card-title">${a.name}</h3><p class="card-description">${a.description}</p><p class="card-meta">${a.duration}s active · ${a.cooldown}s recharge</p>${button(locked ? `Restore ${a.unlock} area${a.unlock > 1 ? 's' : ''} to unlock` : save.ability === a.id ? 'Equipped ✓' : 'Equip ability', 'equip', 'secondary-button', `data-ability="${a.id}" ${locked || save.ability === a.id ? 'disabled' : ''}`)}</article>`; }).join('')}</div><div class="upgrade-card"><div><p class="menu-eyebrow">${save.nectar} HONEY TOKENS</p><h3>Room for a little more</h3><p>Complete flights to earn honey tokens. Bigger pollen baskets mean fewer trips to the hive.</p><p class="card-meta">Current capacity: ${6 + save.capacityLevel * 2} pollen · Upgrade ${save.capacityLevel}/2</p></div>${button(save.capacityLevel === 2 ? 'Fully upgraded ✓' : `+2 basket space · ${cost} honey`, 'upgrade', 'primary-button', save.capacityLevel === 2 || save.nectar < cost ? 'disabled' : '')}</div>${saveNote()}`;
    }
    if (name === 'guide') {
        return `${panelHeading('THE FIELD GUIDE', 'Every discovery has a story', `${save.discoveries.length} / ${DISCOVERIES.length} discoveries. Meet flowers and wildlife during your flights to fill these pages.`)}<div class="card-grid guide-grid">${DISCOVERIES.map(d => { const seen = save.discoveries.includes(d.id); return `<article class="guide-card ${seen ? '' : 'is-locked'}"><span class="card-icon" ${FLOWERS[d.id] ? `style="color:${FLOWERS[d.id].color}"` : ''}>${seen ? d.icon || '✿' : '?'}</span><span class="card-label">${escape(d.category)}</span><h3 class="card-title">${seen ? escape(d.name) : 'Undiscovered'}</h3><p class="card-description">${seen ? escape(d.fact) : `Explore the landscapes to discover this ${d.category.toLowerCase()}.`}</p>${seen && FLOWERS[d.id] ? `<p class="card-meta">${escape(FLOWERS[d.id].habitat)}</p>` : ''}</article>`; }).join('')}</div><details class="guide-sources"><summary>Learn more about real pollinators</summary><p>The bee represents a playful mix of bee traits. In nature, many bees live alone, and plants need pollen from compatible flowers.</p><ul>${SOURCES.map(s => `<li><a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)}</a></li>`).join('')}</ul></details>`;
    }
    if (name === 'badges') return `${panelHeading('LITTLE WINS. LASTING CHANGE.', 'Your pollinator badges', `${save.badges.length} / ${BADGES.length} earned. Every good flight leaves something growing.`)}<div class="card-grid">${BADGES.map(b => `<article class="badge-card ${save.badges.includes(b.id) ? 'is-earned' : 'is-locked'}"><span class="card-icon">${b.icon}</span><span class="card-label">${save.badges.includes(b.id) ? 'EARNED ✓' : 'TO DISCOVER'}</span><h3 class="card-title">${b.name}</h3><p class="card-description">${b.description}</p></article>`).join('')}</div>`;
    if (name === 'settings') return `${panelHeading('FIND YOUR OWN RHYTHM', 'A comfortable flight', 'Audio begins after you press Play. Settings are saved on this browser.')}<div class="settings-list"><label class="setting-row"><span><strong>Nature music</strong><small>A soft, original melody for your travels</small></span><input id="musicSetting" aria-label="Nature music volume" type="range" min="0" max="1" step="0.05" value="${save.settings.music}" data-setting="music"></label><label class="setting-row"><span><strong>Bee & environment sounds</strong><small>Wingbeats, birds, and little moments of discovery</small></span><input aria-label="Sound effects volume" type="range" min="0" max="1" step="0.05" value="${save.settings.sfx}" data-setting="sfx"></label><label class="setting-row"><span><strong>Mute all audio</strong><small>A quiet adventure</small></span><input type="checkbox" data-setting="muted" ${save.settings.muted ? 'checked' : ''}></label><label class="setting-row"><span><strong>Reduced motion</strong><small>Limit particles and decorative movement</small></span><input type="checkbox" data-setting="reducedMotion" ${save.settings.reducedMotion ? 'checked' : ''}></label></div><div class="controls-card"><h3>Your flight controls</h3><p><kbd>W A S D</kbd> or <kbd>↑ ↓ ← →</kbd> Move in any direction</p><p><kbd>Space</kbd> Special ability &nbsp; <kbd>Esc</kbd> Pause / resume</p><p>Fly close to flowers to collect pollen automatically. Match the flower trail, visit a different flower of the same species, then bring your pollen home.</p></div>${saveNote()}`;
    if (name === 'pause') return `<div class="pause-content"><p class="menu-eyebrow">TAKE A BREATHER</p><h2>Even busy bees need a break.</h2><p class="menu-subtitle">${game.level.name} · ${formatTime(game.state.time)} remaining</p><div class="menu-actions">${button('Back to the flowers ↗', 'resume', 'primary-button')}${button('Field guide', 'guide')}${button('Settings', 'settings')}${button('Restart this flight', 'restart')}${button('Return to main menu', 'leave', 'text-button')}</div><p class="save-note">The world waits for you. Your timer is paused.</p></div>`;
    if (name === 'leave') return `<div class="pause-content"><p class="menu-eyebrow">HEADING HOME?</p><h2>Leave this flight?</h2><p class="menu-subtitle">Your discoveries and badges are saved. This flight’s pollen and score will be lost.</p><div class="menu-actions">${button('Keep exploring', 'resume', 'primary-button')}${button('Return to main menu', 'home')}</div></div>`;
    if (name === 'result') {
        const won = result?.won, last = game.level.id === LEVELS.length - 1;
        return `<div class="result-content"><p class="menu-eyebrow">${won ? last ? 'THE PRESERVE IS ALIVE AGAIN' : 'ANOTHER PLACE IN BLOOM' : 'EVERY FLIGHT IS A FRESH START'}</p><h2>${won ? last ? 'Small wings. Real change.' : 'Look what you helped grow.' : 'Let’s try a new flight.'}</h2><p class="menu-subtitle">${won ? `${game.level.name} restored. ${last ? 'You protected every landscape in BioBuzz!' : 'Your next landscape is ready to explore.'}` : result?.reason === 'health' ? 'The hazards got a little too close. Use your ability and stop by the hive to recover a heart.' : 'Time flew by. Follow the highlighted flowers and use your ability to travel faster.'}</p><div class="result-stats"><div class="result-stat"><span>Flight score</span><strong>${game.state.score.toLocaleString()}</strong></div><div class="result-stat"><span>Personal best</span><strong>${(save.best[game.level.id] || 0).toLocaleString()}</strong></div><div class="result-stat"><span>Pollen home</span><strong>${game.state.delivered}</strong></div><div class="result-stat"><span>Honey earned</span><strong>+${result?.reward || 0}</strong></div></div>${won && game.level.id < 2 ? `<p class="unlock-message">New ability unlocked: ${ABILITIES[game.level.id + 1].name}. Equip it in Bee & abilities.</p>` : ''}<div class="menu-actions">${won && !last ? button('Explore the next landscape ↗', 'play', 'primary-button', `data-level="${game.level.id + 1}"`) : button(won ? 'Explore again ↗' : 'Try again ↗', 'play', 'primary-button', `data-level="${game.level.id}"`)}${button('Bee & abilities', 'abilities')}${button('Main menu', 'home', 'text-button')}</div>${saveNote()}</div>`;
    }
    return '';
}

function updateHud() {
    const s = game.state;
    elements.levelName.textContent = game.level.name;
    elements.scoreValue.textContent = s.score.toLocaleString();
    elements.healthValue.textContent = '♥'.repeat(s.health) + '♡'.repeat(s.maxHealth - s.health);
    elements.healthValue.setAttribute('aria-label', `${s.health} of ${s.maxHealth} health`);
    elements.pollenValue.textContent = `${s.carried} / ${s.capacity}`;
    elements.timeValue.textContent = formatTime(s.time);
    elements.timeValue.classList.toggle('is-urgent', s.time < 30);
    elements.deliveryValue.textContent = `${Math.min(s.delivered, s.target)} / ${s.target}`;
    elements.restorationValue.textContent = `${s.challengeIndex} / ${game.level.sequences.length}`;
    const ability = ABILITIES.find(a => a.id === s.ability);
    elements.abilityLabel.textContent = ability.name;
    elements.abilityCooldown.textContent = s.cooldown > 0 ? `${Math.ceil(s.cooldown)}s` : 'Space · ready';
    elements.abilityButton.disabled = s.cooldown > 0 || s.mode !== 'playing';
    elements.pauseButton.disabled = s.mode !== 'playing';
    const trailsDone = s.challengeIndex >= game.level.sequences.length;
    elements.objectiveText.textContent = trailsDone ? 'Flower trails complete! Bring your pollen home.' : `Flower trail ${s.challengeIndex + 1} · visit matching flowers in order`;
    const signature = `${s.challengeIndex}:${s.sequenceIndex}`;
    if (signature !== lastTrail) {
        lastTrail = signature;
        elements.sequenceSteps.innerHTML = s.sequence.map((id, i) => `<span class="trail-step ${i < s.sequenceIndex ? 'is-done' : i === s.sequenceIndex ? 'is-current' : ''}" style="--flower-color:${FLOWERS[id].color}"><b>${i < s.sequenceIndex ? '✓' : i + 1}</b> ${FLOWERS[id].name}${i === s.sequenceIndex ? ' ← next' : ''}</span>`).join('<span class="trail-arrow" aria-hidden="true">→</span>') || '<span class="trail-complete">✓ All flower trails restored</span>';
    }
    const progress = (Math.min(1, s.delivered / s.target) + s.challengeIndex / game.level.sequences.length) / 2;
    if (elements.objectiveProgress) { elements.objectiveProgress.max = 1; elements.objectiveProgress.value = progress; }
    elements.hintText.textContent = s.carried >= s.capacity ? 'Baskets full · return to the hive' : trailsDone ? `Deliver ${Math.max(0, s.target - s.delivered)} more pollen to finish this landscape.` : s.sequenceIndex % 2 ? 'Carry this pollen to a DIFFERENT flower of the same species.' : 'Fly close to a highlighted flower. Pollen collects automatically.';
}

function activate() { if (game.activateAbility()) updateHud(); }
elements.abilityButton.addEventListener('click', () => { activate(); elements.worldCanvas.focus({ preventScroll: true }); });
elements.pauseButton.addEventListener('click', pause);
elements.menuPanel.addEventListener('click', event => {
    const target = event.target.closest('button[data-action]');
    if (!target || target.disabled) return;
    const action = target.dataset.action;
    if (action === 'play') begin(target.dataset.level ?? highestUnlocked(save));
    else if (action === 'resume') { if (activeRun) closeMenu(); }
    else if (action === 'restart') begin(game.level.id);
    else if (action === 'home') goHome();
    else if (action === 'back') showMenu(activeRun ? 'pause' : 'home');
    else if (action === 'equip') {
        const ability = ABILITIES.find(a => a.id === target.dataset.ability);
        if (ability && save.completed.length >= ability.unlock) { save.ability = ability.id; persist(); showMenu('abilities'); }
    } else if (action === 'upgrade') {
        const cost = save.capacityLevel === 0 ? 12 : 24;
        if (save.capacityLevel < 2 && save.nectar >= cost) { save.nectar -= cost; save.capacityLevel++; persist(); showMenu('abilities'); }
    } else if (['levels','abilities','guide','badges','settings','leave'].includes(action)) showMenu(action);
});
elements.menuPanel.addEventListener('input', event => {
    const key = event.target.dataset.setting;
    if (!['music','sfx','muted','reducedMotion'].includes(key)) return;
    save.settings[key] = event.target.type === 'checkbox' ? event.target.checked : Number(event.target.value);
    audio.configure(save.settings);
    game.state.reducedMotion = save.settings.reducedMotion;
    elements.gameApp.dataset.reducedMotion = String(save.settings.reducedMotion);
    persist();
});
const movementKeys = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight']);
document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.code === 'Escape') {
        event.preventDefault();
        if (game.state.mode === 'playing') pause();
        else if (activeRun) { if (screen === 'pause') closeMenu(); else showMenu('pause'); }
        else if (screen !== 'home') showMenu('home');
        return;
    }
    if (event.code === 'Tab' && !elements.menuOverlay.hidden) {
        const focusable = [...elements.menuPanel.querySelectorAll('button:not(:disabled),a[href],input,summary')]
            .filter(control => control.getClientRects().length > 0
                && (!control.closest('details:not([open])') || control.matches('summary')));
        const first = focusable[0], last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    if (game.state.mode !== 'playing') return;
    if (movementKeys.has(event.code)) { event.preventDefault(); keys.add(event.code); }
    if (event.code === 'Space') { event.preventDefault(); if (!event.repeat) activate(); }
});
document.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => { keys.clear(); touchKeys.clear(); pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
for (const control of document.querySelectorAll('[data-move]')) {
    control.addEventListener('pointerdown', event => { event.preventDefault(); control.setPointerCapture(event.pointerId); touchKeys.add(control.dataset.move); });
    for (const type of ['pointerup','pointercancel','lostpointercapture']) control.addEventListener(type, () => touchKeys.delete(control.dataset.move));
}
document.querySelector('.touch-controls [data-action="ability"]')?.addEventListener('click', activate);
window.addEventListener('resize', () => renderer.resize());
// Changes are saved when they occur; do not overwrite another tab's newer save on exit.
window.addEventListener('pagehide', () => audio.setPlaying(false));

function frame(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    if (!document.hidden) {
        if (game.state.mode === 'playing') {
            const left = keys.has('KeyA') || keys.has('ArrowLeft') || touchKeys.has('left');
            const right = keys.has('KeyD') || keys.has('ArrowRight') || touchKeys.has('right');
            const up = keys.has('KeyW') || keys.has('ArrowUp') || touchKeys.has('up');
            const down = keys.has('KeyS') || keys.has('ArrowDown') || touchKeys.has('down');
            game.update(dt, { x: Number(right) - Number(left), y: Number(down) - Number(up) });
            audio.setMoving(Boolean(left || right || up || down));
        } else if (!activeRun && !save.settings.reducedMotion) game.state.elapsed += dt;
        renderer.draw(game.world, game.state, { reducedMotion: save.settings.reducedMotion });
        hudTimer += dt;
        if (hudTimer >= 0.1) { updateHud(); hudTimer = 0; }
        if (now > discoveryUntil) elements.discoveryToast.hidden = true;
        if (now > statusUntil) elements.statusToast.hidden = true;
    }
    requestAnimationFrame(frame);
}
showMenu('home');
updateHud();
requestAnimationFrame(frame);
