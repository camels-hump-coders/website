/**
 * A small, asset-free Web Audio soundscape. The context is created only by
 * unlock(), which the UI calls from a user gesture. Pausing, muting or hiding
 * the tab stops the scheduler and flight oscillators immediately.
 */
export class BioBuzzAudio {
  constructor() {
    this.settings = { music: 0.25, sfx: 0.55, muted: false };
    this.context = null;
    this.playing = false;
    this.moving = false;
    this.destroyed = false;
    this.timer = null;
    this.bar = 0;
    this.voices = new Set();
    this.buzz = null;
    this.visibilityHandler = () => this.sync();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  async unlock() {
    if (this.destroyed) return false;
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) return false;
    try {
      if (!this.context) {
        const context = new AudioContextClass();
        this.context = context;
        this.master = context.createGain();
        this.music = context.createGain();
        this.effects = context.createGain();
        this.master.gain.value = 0.65;
        this.music.connect(this.master);
        this.effects.connect(this.master);
        this.master.connect(context.destination);
        this.configure(this.settings);
      }
      if (this.context.state === 'suspended') await this.context.resume();
      this.sync();
      return this.context.state === 'running';
    } catch {
      // A blocked or unavailable audio device must never block the game.
      return false;
    }
  }

  configure(settings = {}) {
    const volume = (value, previous) => Number.isFinite(Number(value))
      ? Math.max(0, Math.min(1, Number(value))) : previous;
    this.settings = {
      music: settings.music === undefined ? this.settings.music : volume(settings.music, this.settings.music),
      sfx: settings.sfx === undefined ? this.settings.sfx : volume(settings.sfx, this.settings.sfx),
      muted: settings.muted === undefined ? this.settings.muted : Boolean(settings.muted),
    };
    if (this.context && !this.destroyed) {
      const now = this.context.currentTime;
      this.music.gain.setTargetAtTime(this.settings.muted ? 0 : this.settings.music, now, 0.03);
      this.effects.gain.setTargetAtTime(this.settings.muted ? 0 : this.settings.sfx, now, 0.03);
      this.sync();
    }
  }

  setPlaying(playing) {
    this.playing = Boolean(playing);
    this.sync();
  }

  setMoving(moving) {
    const value = Boolean(moving);
    if (value === this.moving) return;
    this.moving = value;
    this.sync();
  }

  get audible() {
    return !this.destroyed && this.context?.state === 'running' && !this.settings.muted
      && (typeof document === 'undefined' || !document.hidden);
  }

  sync() {
    const active = this.audible && this.playing;
    if (active && this.settings.music > 0) {
      if (this.timer === null) {
        this.ambience();
        this.timer = globalThis.setInterval(() => this.ambience(), 2400);
      }
    } else {
      if (this.timer !== null) globalThis.clearInterval(this.timer);
      this.timer = null;
      this.stopVoices('music');
    }
    if (active && this.moving && this.settings.sfx > 0) this.startBuzz();
    else this.stopBuzz();
    if (!this.audible) this.stopVoices();
  }

  /** Pentatonic phrases over soft, slowly changing fifths; occasional birds. */
  ambience() {
    if (!this.audible || !this.playing || this.settings.music <= 0) return;
    const roots = [130.813, 146.832, 164.814, 130.813, 110, 130.813, 146.832, 98];
    const phrases = [[0, 2, 4], [3, 2, 1], [1, 3, 2], [4, 2, 0]];
    const scale = [261.626, 293.665, 329.628, 391.995, 440];
    const root = roots[this.bar % roots.length];
    this.tone(root, 3.9, { bus: 'music', volume: 0.05, attack: 0.7 });
    this.tone(root * 1.5, 3.6, { bus: 'music', volume: 0.022, attack: 0.9 });
    phrases[this.bar % phrases.length].forEach((note, index) => {
      this.tone(scale[note], 1.1, { bus: 'music', volume: 0.035, delay: 0.2 + index * 0.52, attack: 0.05 });
    });
    if (this.bar % 3 === 1) {
      this.tone(1700, 0.16, { bus: 'music', endFrequency: 2450, delay: 1.6, volume: 0.015 });
      this.tone(2250, 0.12, { bus: 'music', endFrequency: 1900, delay: 1.84, volume: 0.012 });
    }
    this.bar += 1;
  }

  startBuzz() {
    if (this.buzz || !this.context) return;
    const context = this.context;
    const wing = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const flutter = context.createOscillator();
    const flutterDepth = context.createGain();
    wing.type = 'sawtooth';
    wing.frequency.value = 155;
    filter.type = 'lowpass';
    filter.frequency.value = 430;
    filter.Q.value = 0.35;
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(0.023, context.currentTime + 0.12);
    flutter.frequency.value = 5.5;
    flutterDepth.gain.value = 5;
    flutter.connect(flutterDepth);
    flutterDepth.connect(wing.frequency);
    wing.connect(filter);
    filter.connect(gain);
    gain.connect(this.effects);
    wing.start();
    flutter.start();
    this.buzz = { wing, filter, gain, flutter, flutterDepth };
  }

  stopBuzz() {
    if (!this.buzz || !this.context) return;
    const nodes = this.buzz;
    this.buzz = null;
    const now = this.context.currentTime;
    nodes.gain.gain.cancelScheduledValues(now);
    nodes.gain.gain.setTargetAtTime(0, now, 0.015);
    nodes.wing.onended = () => Object.values(nodes).forEach(node => node.disconnect());
    try {
      nodes.wing.stop(now + 0.07);
      nodes.flutter.stop(now + 0.07);
    } catch { /* An already stopped context needs no further work. */ }
  }

  play(name) {
    if (!this.audible || this.settings.sfx <= 0) return;
    switch (name) {
      case 'pollen':
        this.tone(659.255, 0.13, { volume: 0.13 });
        this.tone(987.767, 0.2, { volume: 0.08, delay: 0.06 });
        break;
      case 'pollinate':
        this.arpeggio([523.251, 659.255, 783.991], 0.085, 0.11);
        break;
      case 'deposit':
        this.arpeggio([391.995, 523.251, 659.255, 783.991], 0.085, 0.14);
        break;
      case 'damage':
        this.tone(180, 0.24, { endFrequency: 88, volume: 0.1, type: 'triangle' });
        break;
      case 'ability':
        this.tone(240, 0.3, { endFrequency: 900, volume: 0.065, type: 'triangle' });
        this.tone(660, 0.3, { volume: 0.06, delay: 0.1 });
        break;
      case 'discover':
        this.arpeggio([523.251, 783.991, 1046.502], 0.12, 0.085);
        break;
      case 'complete':
        this.arpeggio([523.251, 659.255, 783.991, 1046.502], 0.18, 0.15);
        this.tone(261.626, 1.35, { delay: 0.56, volume: 0.11, attack: 0.07 });
        this.tone(391.995, 1.2, { delay: 0.56, volume: 0.08, attack: 0.07 });
        break;
      default:
        break;
    }
  }

  arpeggio(notes, spacing, volume) {
    notes.forEach((note, index) => this.tone(note, 0.42, { delay: index * spacing, volume }));
  }

  tone(frequency, duration, { delay = 0, volume = 0.1, type = 'sine', endFrequency, attack = 0.012, bus = 'effects' } = {}) {
    if (!this.audible || this.voices.size > 60) return;
    const context = this.context;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const voice = { oscillator, envelope, bus };
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + Math.min(attack, duration / 3));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(this[bus]);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
      this.voices.delete(voice);
    };
    this.voices.add(voice);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.025);
  }

  stopVoices(bus) {
    if (!this.context) return;
    for (const voice of this.voices) {
      if (bus && voice.bus !== bus) continue;
      const now = this.context.currentTime;
      voice.envelope.gain.cancelScheduledValues(now);
      voice.envelope.gain.setTargetAtTime(0, now, 0.01);
      try { voice.oscillator.stop(now + 0.04); } catch { /* Already stopped. */ }
      this.voices.delete(voice);
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.playing = false;
    if (this.timer !== null) globalThis.clearInterval(this.timer);
    this.timer = null;
    this.stopBuzz();
    this.stopVoices();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    if (this.context && this.context.state !== 'closed') this.context.close().catch(() => {});
  }
}
