import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Daktilo } from '../src';
import { detectHits, SampleSoundEngine } from '../src/samples';
import { mount, setReducedMotion } from './helpers';

const RATE = 8000;

/** `times` (sn) anlarında 20 ms'lik sönümlü darbeler içeren sessiz kayıt. */
function recording(times: number[], seconds = 2): Float32Array {
  const data = new Float32Array(RATE * seconds);
  for (const t of times) {
    const start = Math.round(t * RATE);
    for (let i = 0; i < RATE * 0.02; i++) data[start + i] = Math.sin(i) * Math.exp(-i / (RATE * 0.005));
  }
  return data;
}

interface Played {
  buffer: unknown;
  rate: number;
  args: unknown[];
}

const played: Played[] = [];
const gains: Array<ReturnType<typeof param>> = [];
const keyBuffer = { duration: 2, sampleRate: RATE, getChannelData: () => recording([0.2, 0.5, 0.9]) };
const bellBuffer = { duration: 1.9, sampleRate: RATE, getChannelData: () => new Float32Array(10) };

class FakeAudioContext {
  state = 'running';
  currentTime = 0;
  sampleRate = RATE;
  destination = {};
  resume = async () => undefined;
  decodeAudioData = vi.fn(async (data: ArrayBuffer) => ((data as { url?: string }).url === 'bell' ? bellBuffer : keyBuffer));
  createBuffer = (_channels: number, length: number) => {
    const data = new Float32Array(length);
    return { synth: true, getChannelData: () => data };
  };
  createBufferSource = () => {
    const entry: Played = { buffer: null, rate: 1, args: [] };
    const node = {
      playbackRate: { value: 1 },
      set buffer(value: unknown) {
        entry.buffer = value;
      },
      connect: (next: unknown) => next,
      start: (...args: unknown[]) => {
        entry.rate = node.playbackRate.value;
        entry.args = args;
        played.push(entry);
      },
    };
    return node;
  };
  createBiquadFilter = () => ({ frequency: param(), Q: param(), connect: (next: unknown) => next });
  createGain = () => {
    const gain = param();
    gains.push(gain);
    return { gain, connect: (next: unknown) => next };
  };
  createOscillator = () => ({ frequency: param(), connect: (next: unknown) => next, start: vi.fn(), stop: vi.fn() });
}

const param = () => ({ value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });

async function flush(): Promise<void> {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

beforeEach(() => {
  setReducedMotion(false);
  played.length = 0;
  gains.length = 0;
  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => ({ ok: url !== 'missing', status: 404, arrayBuffer: async () => ({ url }) })),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('detectHits', () => {
  it('her vuruşun başlangıcını bulur ve dilimleri bir sonrakiyle çakıştırmaz', () => {
    const times = [0.2, 0.5, 0.6, 1.3];
    const hits = detectHits(recording(times), RATE);
    expect(hits).toHaveLength(4);
    hits.forEach(([start], i) => expect(start).toBeCloseTo(times[i], 2));
    expect(hits[1][0] + hits[1][1]).toBeLessThanOrEqual(hits[2][0]);
    hits.forEach(([, duration]) => expect(duration).toBeLessThanOrEqual(0.12));
  });

  it('sessiz kayıtta vuruş bulmaz', () => {
    expect(detectHits(new Float32Array(RATE), RATE)).toEqual([]);
  });
});

describe('SampleSoundEngine', () => {
  it('kayıtlar çözülene kadar sentez sese düşer, sonra kayıttan dilim çalar', async () => {
    const engine = new SampleSoundEngine({ key: 'keys', bell: 'bell' });
    window.dispatchEvent(new Event('pointerdown'));

    engine.playKeyClick();
    expect(played[0].buffer).toMatchObject({ synth: true });

    await flush();
    engine.playKeyClick();
    const last = played[played.length - 1];
    expect(last.buffer).toBe(keyBuffer);
    expect(last.args).toHaveLength(3);
    expect(last.rate).toBeGreaterThanOrEqual(0.95);
    engine.dispose();
  });

  it('vuruşu tam seviyede çalar, yalnızca son 15 ms içinde kısar', async () => {
    const engine = new SampleSoundEngine({ key: 'keys', volume: 0.5 });
    window.dispatchEvent(new Event('pointerdown'));
    engine.playKeyClick();
    await flush();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    engine.playKeyClick();

    const { args, rate } = played[played.length - 1];
    const end = (args[2] as number) / rate;
    const gain = gains[gains.length - 1];
    expect(gain.setValueAtTime.mock.calls).toEqual([
      [0.5, 0],
      [0.5, expect.closeTo(end - 0.015, 6)],
    ]);
    expect(gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, expect.closeTo(end, 6));
    engine.dispose();
  });

  it('boşluk tuşunda vuruşu daha pes çalar, çanda kaydın tamamını çalar', async () => {
    const engine = new SampleSoundEngine({ key: 'keys', bell: 'bell' });
    window.dispatchEvent(new Event('pointerdown'));
    engine.playKeyClick();
    await flush();

    engine.playKeyClick(true);
    expect(played[played.length - 1].rate).toBe(0.8);

    engine.playCarriageDing();
    const bell = played[played.length - 1];
    expect(bell.buffer).toBe(bellBuffer);
    expect(bell.args).toHaveLength(1);
    engine.dispose();
  });

  it('dosya yüklenemezse uyarır ve sentezle devam eder', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const engine = new SampleSoundEngine({ key: 'missing' });
    window.dispatchEvent(new Event('pointerdown'));
    engine.playKeyClick();
    await flush();
    engine.playKeyClick();

    expect(warn).toHaveBeenCalledOnce();
    expect(played.every((p) => (p.buffer as { synth?: boolean }).synth)).toBe(true);
    engine.dispose();
  });
});

describe('Daktilo + SampleSoundEngine', () => {
  it('sound seçeneğine verilen motoru yazarken kullanır', async () => {
    vi.useFakeTimers();
    const engine = new SampleSoundEngine({ key: 'keys' });
    const keyClick = vi.spyOn(engine, 'playKeyClick');
    const d = new Daktilo(mount('<p>ab</p>'), { animate: true, sound: engine, typoRate: 0, inkWear: 0 });
    await vi.runAllTimersAsync();
    await d.finished;
    expect(keyClick).toHaveBeenCalledTimes(2);
    d.destroy();
    vi.useRealTimers();
  });

  it('prefers-reduced-motion aktifken verilen motoru kapatır', () => {
    setReducedMotion(true);
    const engine = new SampleSoundEngine({ key: 'keys' });
    const dispose = vi.spyOn(engine, 'dispose');
    new Daktilo(mount('<p>ab</p>'), { sound: engine });
    expect(dispose).toHaveBeenCalledOnce();
  });
});
