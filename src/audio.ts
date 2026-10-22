type AudioContextCtor = typeof AudioContext;

const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchend'] as const;

// Tarayıcılar sayfa başına AudioContext sayısını sınırladığı için tüm örnekler tek bağlamı paylaşır.
let sharedContext: AudioContext | null = null;

function audioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
}

/** Harici ses dosyası kullanmadan Web Audio API ile mekanik daktilo sesleri sentezler. */
export class MechanicalSoundEngine {
  #ctx: AudioContext | null = null;
  #buffers = new Map<boolean, AudioBuffer>();
  #enabled: boolean;
  #volume: number;

  constructor(enabled = false, volume = 0.4) {
    this.#enabled = enabled && !!audioContextCtor();
    this.#volume = volume;
    if (!this.#enabled) return;
    // Autoplay politikası: bağlam ancak bir kullanıcı etkileşiminden sonra çalışabilir.
    UNLOCK_EVENTS.forEach((type) => window.addEventListener(type, this.#unlock, { once: true, passive: true }));
    if ((navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive) {
      this.#unlock();
    }
  }

  setVolume(volume: number): void {
    this.#volume = Math.min(1, Math.max(0, volume));
  }

  /** Tuş vuruşu (bandpass, 1100-1600Hz) veya boşluk tuşu (lowpass, 400-600Hz) sesi. */
  playKeyClick(isSpace = false): void {
    const ctx = this.#ready();
    if (!ctx) return;
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = this.#noiseBuffer(ctx, isSpace);
    source.playbackRate.value = 0.9 + Math.random() * 0.2;

    const filter = ctx.createBiquadFilter();
    filter.type = isSpace ? 'lowpass' : 'bandpass';
    filter.frequency.setValueAtTime(isSpace ? 400 + Math.random() * 200 : 1100 + Math.random() * 500, now);
    filter.Q.setValueAtTime(isSpace ? 1.2 : 2.5, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.#volume * (isSpace ? 1.6 : 1), now);

    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(now);
  }

  /** Satır sonu çanı: 2200Hz sine ve metalik tını için uyumsuz (inharmonic) bir üst kısmi. */
  playCarriageDing(): void {
    const ctx = this.#ready();
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
      gain.gain.setValueAtTime(this.#volume * level, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.65);
    }
  }

  dispose(): void {
    this.#enabled = false;
    if (typeof window === 'undefined') return;
    UNLOCK_EVENTS.forEach((type) => window.removeEventListener(type, this.#unlock));
  }

  #unlock = (): void => {
    if (!this.#enabled) return;
    const Ctor = audioContextCtor();
    if (!Ctor) return;
    sharedContext ??= new Ctor();
    this.#ctx = sharedContext;
    if (this.#ctx.state === 'suspended') void this.#ctx.resume().catch(() => undefined);
  };

  #ready(): AudioContext | null {
    const ctx = this.#ctx;
    return this.#enabled && this.#volume > 0 && ctx && ctx.state === 'running' ? ctx : null;
  }

  // Mekanik darbe zarfı: keskin atak, üstel sönüm. Gürültü bir kez üretilir; her vuruşta filtre değişir.
  #noiseBuffer(ctx: AudioContext, isSpace: boolean): AudioBuffer {
    let buffer = this.#buffers.get(isSpace);
    if (buffer) return buffer;
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * (isSpace ? 0.045 : 0.025));
    const decay = rate * (isSpace ? 0.012 : 0.006);
    buffer = ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / decay);
    this.#buffers.set(isSpace, buffer);
    return buffer;
  }
}
