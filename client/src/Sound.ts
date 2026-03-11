export class Sound {
  private ctx: AudioContext;

  constructor() {
    this.ctx = new AudioContext();
    // Resume on first user interaction
    const resume = () => {
      this.ctx.resume();
      window.removeEventListener("click", resume);
      window.removeEventListener("keydown", resume);
    };
    window.addEventListener("click", resume);
    window.addEventListener("keydown", resume);
  }

  shoot() {
    this.noise(0.08, 800, 200, 0.15);
  }

  shootSpecial() {
    this.noise(0.12, 1200, 300, 0.2);
  }

  hit() {
    this.noise(0.15, 200, 60, 0.25);
  }

  explosion() {
    this.noise(0.4, 120, 30, 0.35);
  }

  pickup() {
    this.tone(0.1, 600, 900, 0.15);
  }

  private noise(
    duration: number,
    freqStart: number,
    freqEnd: number,
    volume: number
  ) {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, now + duration);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  private tone(
    duration: number,
    freqStart: number,
    freqEnd: number,
    volume: number
  ) {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.linearRampToValueAtTime(freqEnd, now + duration);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }
}
