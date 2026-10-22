import { describe, expect, it } from 'vitest';
import { neighborKey } from '../src/keyboard';
import { resolveOptions } from '../src/options';

describe('resolveOptions', () => {
  it('PRD varsayılanlarını uygular', () => {
    expect(resolveOptions()).toEqual({
      paper: 'vintage',
      ribbonColor: undefined,
      maxWidth: '65ch',
      inkWear: 0.35,
      animate: false,
      speed: 45,
      typoRate: 0.02,
      overstrikeChar: 'x',
      sound: false,
      volume: 0.4,
      stamp: null,
      fonts: true,
      respectReducedMotion: true,
    });
  });

  it('sayısal değerleri izin verilen aralığa sıkıştırır', () => {
    const o = resolveOptions({ inkWear: 4, typoRate: 0.9, volume: -1, speed: Number.NaN });
    expect(o.inkWear).toBe(1);
    expect(o.typoRate).toBe(0.2);
    expect(o.volume).toBe(0);
    expect(o.speed).toBe(45);
  });

  it('geçersiz kağıt ve overstrike değerlerinde varsayılana döner', () => {
    const o = resolveOptions({ paper: 'papyrus' as never, overstrikeChar: '#' as never });
    expect(o.paper).toBe('vintage');
    expect(o.overstrikeChar).toBe('x');
  });
});

describe('neighborKey', () => {
  it('klavyede komşu bir tuş döndürür', () => {
    const neighbors = new Set<string>();
    for (let i = 0; i < 6; i++) neighbors.add(neighborKey('g', () => i / 6));
    expect([...neighbors].sort()).toEqual(['b', 'f', 'h', 't', 'v', 'y']);
  });

  it('büyük harfi korur ve Türkçe karakterleri tanır', () => {
    expect(neighborKey('A', () => 0)).toMatch(/^[A-ZÇĞİIÖŞÜ]$/);
    expect(['L', 'İ', 'Ğ', 'Ü', 'Ç', 'Ö']).toContain(neighborKey('Ş', () => 0.99).toLocaleUpperCase('tr'));
  });

  it('klavyede olmayan karakter için yine bir harf döndürür', () => {
    expect(neighborKey('é', () => 0)).toMatch(/^\p{L}$/u);
  });
});
