// Web Audio API Sound Synthesizer (Zero external dependencies)
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.init();
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.playTone(880, 'sine', 0.1, 0.08);
      setTimeout(() => this.playTone(1320, 'sine', 0.12, 0.08), 80);
    }
    return this.enabled;
  }

  playTone(freq, type = 'sine', duration = 0.12, gainVal = 0.05) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  click() {
    this.playTone(600, 'sine', 0.05, 0.04);
  }

  open() {
    this.playTone(640, 'triangle', 0.1, 0.05);
  }

  close() {
    this.playTone(400, 'triangle', 0.08, 0.04);
  }

  scan() {
    this.playTone(520, 'sine', 0.08, 0.05);
    setTimeout(() => this.playTone(840, 'sine', 0.12, 0.06), 90);
  }

  alert() {
    this.playTone(320, 'sawtooth', 0.3, 0.1);
  }

  clean() {
    this.playTone(880, 'sine', 0.12, 0.06);
    setTimeout(() => this.playTone(1174, 'sine', 0.18, 0.07), 100);
  }
}

export const soundFX = new SoundFX();

