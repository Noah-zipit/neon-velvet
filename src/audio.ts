// WebAudio-synthesized music + SFX. No external audio files.
// Chiptune bass loop, blips, and crowd ambience — all generated.

type SfxName = "jump" | "collect" | "hurt" | "checkpoint" | "goal" | "click" | "unlock" | "denied";

const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private crowdGain: GainNode | null = null;
  private muted = false;
  private seqTimer: number | null = null;
  private step = 0;
  private nextT = 0;
  private noiseBuf: AudioBuffer | null = null;

  get isMuted() { return this.muted; }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.02);
    }
  }

  /** Must be called from a user gesture at least once. */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.5;
    this.musicGain.connect(this.master);
    this.crowdGain = this.ctx.createGain();
    this.crowdGain.gain.value = 0;
    this.crowdGain.connect(this.master);
    // shared noise buffer
    const len = this.ctx.sampleRate * 1;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  // ------------------------------------------------------------- music ---
  // 132 BPM, 16 steps/bar, 4-bar loop: Am F C G. Bass + kick + hats + arp.
  startMusic() {
    this.ensure();
    if (!this.ctx || this.seqTimer !== null) return;
    this.step = 0;
    this.nextT = this.ctx.currentTime + 0.06;
    const stepDur = 60 / 132 / 4;
    this.seqTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicGain) return;
      while (this.nextT < this.ctx.currentTime + 0.12) {
        this.playStep(this.step, this.nextT, stepDur);
        this.nextT += stepDur;
        this.step = (this.step + 1) % 64;
      }
    }, 30);
  }

  stopMusic() {
    if (this.seqTimer !== null) {
      clearInterval(this.seqTimer);
      this.seqTimer = null;
    }
  }

  private playStep(s: number, t: number, stepDur: number) {
    const bar = Math.floor(s / 16); // 0..3
    const roots = [33, 29, 36, 31]; // A1 F1 C2 G1 (midi)
    const root = roots[bar];
    const inBar = s % 16;
    // kick: four on the floor
    if (inBar % 4 === 0) this.kick(t);
    // hats: offbeats + 16th ghosts
    if (inBar % 4 === 2) this.hat(t, 0.5);
    else if (inBar % 2 === 1) this.hat(t, 0.18);
    // snare-ish noise on 4 and 12
    if (inBar === 4 || inBar === 12) this.snare(t);
    // bass: syncopated roots with octave pops
    const bassSteps: Record<number, number> = { 0: 0, 3: 0, 6: 12, 8: 0, 11: 0, 14: 7 };
    if (inBar in bassSteps) this.bass(t, midi(root + bassSteps[inBar]), stepDur * 2.2);
    // lead arp: sparse, pentatonic over the root
    const arp: Record<number, number> = { 2: 12, 7: 15, 10: 19, 13: 24 };
    if (bar >= 1 && inBar in arp) this.pluck(t, midi(root + 24 + arp[inBar]), stepDur * 3);
  }

  private kick(t: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(g).connect(this.musicGain!);
    o.start(t); o.stop(t + 0.16);
  }

  private hat(t: number, vol: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = "highpass"; f.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol * 0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    src.connect(f).connect(g).connect(this.musicGain!);
    src.start(t, Math.random()); src.stop(t + 0.07);
  }

  private snare(t: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass"; f.frequency.value = 1900; f.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    src.connect(f).connect(g).connect(this.musicGain!);
    src.start(t, Math.random()); src.stop(t + 0.14);
  }

  private bass(t: number, freq: number, dur: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = freq;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(220, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.34, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(f).connect(g).connect(this.musicGain!);
    o.start(t); o.stop(t + dur + 0.02);
  }

  private pluck(t: number, freq: number, dur: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.musicGain!);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // -------------------------------------------------------------- crowd ---
  startCrowd() {
    this.ensure();
    if (!this.ctx || !this.crowdGain || !this.noiseBuf) return;
    this.stopCrowd();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass"; f.frequency.value = 500; f.Q.value = 0.4;
    const g = this.ctx.createGain();
    g.gain.value = 0.5;
    src.connect(f).connect(g).connect(this.crowdGain);
    src.start();
    this.crowdGain.gain.setTargetAtTime(0.35, this.ctx.currentTime, 1.2);
    (this as unknown as { _crowd?: AudioBufferSourceNode })._crowd = src;
  }

  stopCrowd() {
    const c = (this as unknown as { _crowd?: AudioBufferSourceNode })._crowd;
    if (c) { try { c.stop(); } catch { /* already stopped */ } }
    (this as unknown as { _crowd?: undefined })._crowd = undefined;
    if (this.ctx && this.crowdGain) {
      this.crowdGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    }
  }

  // ----------------------------------------------------------------- sfx ---
  sfx(name: SfxName) {
    this.ensure();
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case "jump": this.blip(t, 300, 620, 0.09, "square", 0.22); break;
      case "collect": this.blip(t, 880, 880, 0.07, "sine", 0.25); this.blip(t + 0.07, 1320, 1320, 0.09, "sine", 0.22); break;
      case "hurt": this.blip(t, 220, 70, 0.25, "sawtooth", 0.3); break;
      case "checkpoint": this.blip(t, 660, 660, 0.09, "triangle", 0.25); this.blip(t + 0.1, 990, 990, 0.12, "triangle", 0.25); break;
      case "goal": [523, 659, 784, 1046].forEach((f, i) => this.blip(t + i * 0.09, f, f, 0.14, "square", 0.2)); break;
      case "unlock": [392, 523, 659, 784, 1046, 1318].forEach((f, i) => this.blip(t + i * 0.08, f, f, 0.16, "triangle", 0.22)); break;
      case "click": this.blip(t, 700, 700, 0.05, "square", 0.15); break;
      case "denied": this.blip(t, 180, 140, 0.16, "square", 0.2); break;
    }
  }

  private blip(t: number, f0: number, f1: number, dur: number, type: OscillatorType, vol: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master!);
    o.start(t); o.stop(t + dur + 0.02);
  }
}
