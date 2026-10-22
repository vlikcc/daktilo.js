import { MechanicalSoundEngine } from './audio';

export interface SoundSamples {
  /** Tuş vuruşları içeren kayıt; vuruşlar otomatik ayrıştırılır ve her tuşta rastgele biri çalınır. */
  key?: string;
  /** Satır sonu çanı kaydı; olduğu gibi çalınır. */
  bell?: string;
  /** Ses seviyesi (0.0 - 1.0). Varsayılan: 0.4 */
  volume?: number;
}

type Hit = [offset: number, duration: number];

/** Kayıttaki tuş vuruşlarını, 2 ms'lik enerji zarfında eşiği yukarı kesen ani yükselişlerden bulur. */
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
      console.warn(`daktilo-js: ses dosyası yüklenemedi (${url})`, error);
      return null;
    });
}

/**
 * Sentez yerine gerçek daktilo kayıtlarını çalan ses motoru. Kayıtlar kullanıcı etkileşimiyle
 * ses kilidi açıldıktan sonra çözülür; o zamana kadar (veya yüklenemezlerse) sentez sesler çalar.
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

  /** `hit` verilirse kaydın yalnızca o dilimini, sonu tıklamasın diye sönümleyerek çalar. */
  #play(ctx: AudioContext, buffer: AudioBuffer, rate: number, hit?: Hit): void {
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.volume, now);
    if (hit) gain.gain.linearRampToValueAtTime(0, now + hit[1] / rate);
    source.connect(gain).connect(ctx.destination);
    if (hit) source.start(now, hit[0], hit[1]);
    else source.start(now);
  }
}
