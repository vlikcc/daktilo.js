import { MechanicalSoundEngine } from './audio';

export interface SoundSamples {
  /** Recording of key strikes; strikes are detected automatically and a random one plays per key. */
  key?: string;
  /** Bell recording, played as-is. */
  bell?: string;
  /** Volume (0.0 - 1.0). Default: 0.4 */
  volume?: number;
}

type Hit = [offset: number, duration: number];

/** Finds key strikes in a recording: sudden rises above a threshold in a 2 ms energy envelope. */
export function detectHits(data: Float32Array, rate: number): Hit[] {
  const hop = Math.max(1, Math.round(rate * 0.002));
  const env: number[] = [];
  let peak = 0;
  for (let i = 0; i + hop <= data.length; i += hop) {
    let sum = 0;
    for (let j = i; j < i + hop; j++) sum += data[j] * data[j];
    env.push(Math.sqrt(sum / hop));
    peak = Math.max(peak, env[env.length - 1]);
  }
  const onsets: number[] = [];
  env.forEach((e, i) => {
    const sinceLast = i - (onsets[onsets.length - 1] ?? -Infinity);
    const before = Math.max(0, ...env.slice(Math.max(0, i - 10), i));
    if (e > peak * 0.18 && sinceLast > 35 && before < e * 0.6) onsets.push(i);
  });
  const step = hop / rate;
  return onsets.map((i, k) => {
    const start = Math.max(0, i * step - 0.004);
    const end = Math.min(start + 0.12, (onsets[k + 1] ?? Infinity) * step - 0.004, data.length / rate);
    return [start, end - start];
  });
}

function fetchAudio(url: string | undefined): Promise<ArrayBuffer | null> {
  if (!url || typeof fetch !== 'function') return Promise.resolve(null);
  return fetch(url)
    .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(`HTTP ${res.status}`))))
    .catch((error) => {
      console.warn(`daktilo-js: could not load sound file (${url})`, error);
      return null;
    });
}

/**
 * Sound engine that plays real typewriter recordings instead of synthesis. Recordings are decoded
 * once audio is unlocked by a user interaction; until then (or if they fail to load) the synth plays.
 */
export class SampleSoundEngine extends MechanicalSoundEngine {
  #keyData: Promise<ArrayBuffer | null>;
  #bellData: Promise<ArrayBuffer | null>;
  #decoding = false;
  #keys: AudioBuffer | null = null;
  #hits: Hit[] = [];
  #bell: AudioBuffer | null = null;

  constructor({ key, bell, volume = 0.4 }: SoundSamples) {
    super(true, volume);
    const browser = typeof window !== 'undefined';
    this.#keyData = fetchAudio(browser ? key : undefined);
    this.#bellData = fetchAudio(browser ? bell : undefined);
  }

  override playKeyClick(isSpace = false): void {
    const ctx = this.#readyAndDecode();
    const hit = this.#hits[Math.floor(Math.random() * this.#hits.length)];
    if (!ctx || !this.#keys || !hit) return super.playKeyClick(isSpace);
    // Boşluk tuşu: aynı vuruşun daha pes ve tok hâli.
    this.#play(ctx, this.#keys, isSpace ? 0.8 : 0.95 + Math.random() * 0.1, hit);
  }

  override playCarriageDing(): void {
    const ctx = this.#readyAndDecode();
    if (!ctx || !this.#bell) return super.playCarriageDing();
    this.#play(ctx, this.#bell, 1);
  }

  #readyAndDecode(): AudioContext | null {
    const ctx = this.ready();
    if (ctx && !this.#decoding) {
      this.#decoding = true;
      const decode = (data: Promise<ArrayBuffer | null>) =>
        data.then((buffer) => (buffer ? ctx.decodeAudioData(buffer) : null)).catch(() => null);
      void decode(this.#keyData).then((buffer) => {
        if (!buffer) return;
        this.#hits = detectHits(buffer.getChannelData(0), buffer.sampleRate);
        this.#keys = buffer;
      });
      void decode(this.#bellData).then((buffer) => (this.#bell = buffer));
    }
    return ctx;
  }

  /** `hit` verilirse kaydın yalnızca o dilimini çalar; kesimde tıkırtı olmasın diye son 15 ms'yi kısar. */
  #play(ctx: AudioContext, buffer: AudioBuffer, rate: number, hit?: Hit): void {
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.volume, now);
    if (hit) {
      const end = now + hit[1] / rate;
      gain.gain.setValueAtTime(this.volume, Math.max(now, end - 0.015));
      gain.gain.linearRampToValueAtTime(0, end);
    }
    source.connect(gain).connect(ctx.destination);
    if (hit) source.start(now, hit[0], hit[1]);
    else source.start(now);
  }
}
