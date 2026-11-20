// Procedural WebAudio Ambient Surf, Footstep, Vehicle Engine & Indian Horn Synthesizer

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.85;
    this.surfGain = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.stepTimer = 0;
  }

  ensureStarted() {
    if (!this.enabled) return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      try {
        this.ctx = new AudioCtx();
        this._setupOceanSurf();
        this._setupEngineSynth();
      } catch (_) {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setEnabled(flag) {
    this.enabled = Boolean(flag);
    if (!this.enabled && this.surfGain && this.ctx) {
      this.surfGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      if (this.engineGain) this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, Number(vol) || 0));
    if (this.volume <= 0.01 && this.surfGain && this.ctx) {
      this.surfGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      if (this.engineGain) this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
    }
  }

  _setupOceanSurf() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.03 * white) / 1.03;
      lastOut = data[i];
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 380;

    this.surfGain = this.ctx.createGain();
    this.surfGain.gain.value = 0.0;

    noise.connect(filter);
    filter.connect(this.surfGain);
    this.surfGain.connect(this.ctx.destination);
    noise.start();
  }

  _setupEngineSynth() {
    if (!this.ctx) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 58;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 210;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.0;

    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();
  }

  playFootstep(onSand = false) {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running' || this.volume <= 0.01) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(onSand ? 95 : 145, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(42, this.ctx.currentTime + 0.055);
    gain.gain.setValueAtTime(0.05 * this.volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.065);
  }

  playHorn() {
    this.ensureStarted();
    if (!this.enabled || !this.ctx || this.volume <= 0.01) return;
    const now = this.ctx.currentTime;
    for (const freq of [415, 520]) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.08 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  }

  update(dt, distToCoast, horizSpeed, inVehicle, grounded, onSand) {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;

    // Modulate Bay of Bengal wave volume by proximity to RK Beach shoreline
    if (this.surfGain) {
      const surfVol = Math.max(0, Math.min(0.16, (1 - distToCoast / 140) * 0.16)) * this.volume;
      this.surfGain.gain.setTargetAtTime(surfVol, this.ctx.currentTime, 0.25);
    }

    if (inVehicle && this.engineGain && this.engineOsc) {
      const rpmFreq = 52 + Math.min(130, horizSpeed * 4.2);
      this.engineOsc.frequency.setTargetAtTime(rpmFreq, this.ctx.currentTime, 0.08);
      this.engineGain.gain.setTargetAtTime(0.045 * this.volume, this.ctx.currentTime, 0.1);
    } else {
      if (this.engineGain) {
        this.engineGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.1);
      }
      if (grounded && horizSpeed > 0.6) {
        this.stepTimer += dt * horizSpeed;
        if (this.stepTimer >= 2.2) {
          this.stepTimer = 0;
          this.playFootstep(onSand);
        }
      }
    }
  }
}
