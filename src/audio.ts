import type { SoundEngine } from './types';

type AudioContextCtor = typeof AudioContext;

const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchend'] as const;

// Tarayıcılar sayfa başına AudioContext sayısını sınırladığı için tüm örnekler tek bağlamı paylaşır.
let sharedContext: AudioContext | null = null;

function audioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
}

/** Synthesizes mechanical typewriter sounds with the Web Audio API, without any audio files. */
export class MechanicalSoundEngine implements SoundEngine {
  protected volume: number;
  #ctx: AudioContext | null = null;
  #buffers = new Map<string, AudioBuffer>();
  #enabled: boolean;

  constructor(enabled = false, volume = 0.4) {
    this.#enabled = enabled && !!audioContextCtor();
    this.volume = volume;
    if (!this.#enabled) return;
    // Autoplay politikası: bağlam ancak bir kullanıcı etkileşiminden sonra çalışabilir.
    UNLOCK_EVENTS.forEach((type) => window.addEventListener(type, this.#unlock, { once: true, passive: true }));
    if ((navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive) {
      this.#unlock();
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
  }

  /** Key strike (bandpass, 1100-1600 Hz) or space bar thud (lowpass, 400-600 Hz). */
  playKeyClick(isSpace = false): void {
    const ctx = this.ready();
    if (!ctx) return;
    const r = Math.random();
    if (isSpace)
      this.#burst(
        ctx,
        this.#noise(ctx, 's', 0.045, (t) => Math.exp(-t / 0.012)),
        'lowpass',
        400 + r * 200,
        1.2,
        1.6,
      );
    else
      this.#burst(
        ctx,
        this.#noise(ctx, 'k', 0.025, (t) => Math.exp(-t / 0.006)),
        'bandpass',
        1100 + r * 500,
        2.5,
        1,
      );
  }

  /** Margin bell: a 2200 Hz sine plus an inharmonic partial for a metallic timbre. */
  playCarriageDing(): void {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const [frequency, level] of [
      [2200, 0.6],
      [5940, 0.12],
    ]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(this.volume * level, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.65);
    }
  }

  /** Carriage return: the ratchet buzz of the sliding carriage, ending in a thud. */
  playCarriageReturn(): void {
    const ctx = this.ready();
    if (!ctx) return;
    // cos^8 her ~26 ms'de keskin bir cırcır dişi verir; sonda kızak durunca tok bir vuruş gelir.
    const buffer = this.#noise(
      ctx,
      'r',
      0.34,
      (t) => Math.exp(-t * 4) * (0.3 + 0.7 * Math.cos(t * 240) ** 8) + (t > 0.3 ? 2 * Math.exp((0.3 - t) * 90) : 0),
    );
    this.#burst(ctx, buffer, 'bandpass', 2600, 1, 1.4).exponentialRampToValueAtTime(700, ctx.currentTime + 0.3);
  }

  dispose(): void {
    this.#enabled = false;
    if (typeof window === 'undefined') return;
    UNLOCK_EVENTS.forEach((type) => window.removeEventListener(type, this.#unlock));
  }

  /** Returns the audio context when sound can play (enabled, unlocked, volume > 0). */
  protected ready(): AudioContext | null {
    const ctx = this.#ctx;
    return this.#enabled && this.volume > 0 && ctx && ctx.state === 'running' ? ctx : null;
  }

  #unlock = (): void => {
    if (!this.#enabled) return;
    const Ctor = audioContextCtor();
    if (!Ctor) return;
    sharedContext ??= new Ctor();
    this.#ctx = sharedContext;
    if (this.#ctx.state === 'suspended') void this.#ctx.resume().catch(() => undefined);
  };

  /** Gürültü tamponunu filtre ve ses seviyesinden geçirip çalar; filtre frekansını döndürür. */
  #burst(ctx: AudioContext, buffer: AudioBuffer, type: BiquadFilterType, frequency: number, q: number, level: number) {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = 0.9 + Math.random() * 0.2;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = this.volume * level;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
    return filter.frequency;
  }

  /** Zarfı `envelope(t)` olan beyaz gürültü; her ses için bir kez üretilir, her çalışta filtre değişir. */
  #noise(ctx: AudioContext, key: string, seconds: number, envelope: (t: number) => number): AudioBuffer {
    let buffer = this.#buffers.get(key);
    if (buffer) return buffer;
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    buffer = ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * envelope(i / rate);
    this.#buffers.set(key, buffer);
    return buffer;
  }
}
