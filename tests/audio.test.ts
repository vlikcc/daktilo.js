import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Daktilo, MechanicalSoundEngine } from '../src';
import { mount, setReducedMotion } from './helpers';

class FakeParam {
  value = 0;
  setValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
}

class FakeNode {
  connect = vi.fn((next: unknown) => next);
  start = vi.fn();
  stop = vi.fn();
  frequency = new FakeParam();
  Q = new FakeParam();
  gain = new FakeParam();
  playbackRate = new FakeParam();
  type = '';
  buffer: unknown = null;
}

const created: string[] = [];

class FakeAudioContext {
  static instances = 0;
  state = 'suspended';
  currentTime = 0;
  sampleRate = 8000;
  destination = {};
  constructor() {
    FakeAudioContext.instances++;
  }
  resume = vi.fn(async () => {
    this.state = 'running';
  });
  createBuffer = (_channels: number, length: number) => {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  };
  createBufferSource = () => (created.push('source'), new FakeNode());
  createBiquadFilter = () => (created.push('filter'), new FakeNode());
  createGain = () => new FakeNode();
  createOscillator = () => (created.push('oscillator'), new FakeNode());
}

beforeEach(() => {
  setReducedMotion(false);
  created.length = 0;
  vi.stubGlobal('AudioContext', FakeAudioContext);
});
afterEach(() => vi.unstubAllGlobals());

describe('MechanicalSoundEngine', () => {
  it('kullanıcı etkileşiminden önce ses çalmaz, ilk pointerdown ile kilidi açar', async () => {
    const engine = new MechanicalSoundEngine(true, 0.4);
    engine.playKeyClick();
    expect(created).toEqual([]);

    window.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();
    engine.playKeyClick();
    expect(created).toEqual(['source', 'filter']);
    engine.dispose();
  });

  it('tuş, boşluk ve çan seslerini dosyasız sentezler', async () => {
    const engine = new MechanicalSoundEngine(true, 0.4);
    window.dispatchEvent(new Event('keydown'));
    await Promise.resolve();

    engine.playKeyClick(false);
    engine.playKeyClick(true);
    engine.playCarriageDing();
    expect(created.filter((c) => c === 'source')).toHaveLength(2);
    expect(created.filter((c) => c === 'oscillator')).toHaveLength(2);
    engine.dispose();
  });

  it('satır başı sesini cırcır zarflı gürültüden süzgeç süpürmesiyle sentezler', async () => {
    const engine = new MechanicalSoundEngine(true, 0.4);
    window.dispatchEvent(new Event('keydown'));
    await Promise.resolve();
    engine.playCarriageReturn();
    expect(created).toEqual(['source', 'filter']);
    engine.dispose();
  });

  it('tüm örnekler tek AudioContext paylaşır', async () => {
    const before = FakeAudioContext.instances;
    const a = new MechanicalSoundEngine(true);
    const b = new MechanicalSoundEngine(true);
    window.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();
    expect(FakeAudioContext.instances - before).toBeLessThanOrEqual(1);
    a.dispose();
    b.dispose();
  });

  it('kapalıyken veya ses 0 iken hiçbir şey çalmaz', async () => {
    const off = new MechanicalSoundEngine(false);
    const muted = new MechanicalSoundEngine(true, 0);
    window.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();
    off.playKeyClick();
    muted.playCarriageDing();
    expect(created).toEqual([]);
    muted.dispose();
  });

  it('AudioContext olmayan ortamlarda hata vermez', () => {
    vi.stubGlobal('AudioContext', undefined);
    const engine = new MechanicalSoundEngine(true);
    expect(() => {
      engine.playKeyClick();
      engine.playCarriageDing();
      engine.dispose();
    }).not.toThrow();
  });
});

describe('Daktilo ses entegrasyonu', () => {
  it('yazarken tuş sesleri çalar', async () => {
    vi.useFakeTimers();
    const el = mount('<p>ab</p>');
    const d = new Daktilo(el, { animate: true, sound: true, typoRate: 0, inkWear: 0 });
    window.dispatchEvent(new Event('pointerdown'));
    await vi.runAllTimersAsync();
    await d.finished;
    expect(created.filter((c) => c === 'source').length).toBeGreaterThan(0);
    d.destroy();
    vi.useRealTimers();
  });

  it('prefers-reduced-motion aktifken ses motorunu hiç başlatmaz', () => {
    setReducedMotion(true);
    const addListener = vi.spyOn(window, 'addEventListener');
    new Daktilo(mount('<p>ab</p>'), { sound: true });
    expect(addListener).not.toHaveBeenCalledWith('pointerdown', expect.anything(), expect.anything());
    addListener.mockRestore();
  });
});
