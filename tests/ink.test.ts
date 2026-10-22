import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Daktilo } from '../src';
import { applyInkWear, inkSpan } from '../src/ink';
import { mount, setReducedMotion } from './helpers';

beforeEach(() => setReducedMotion(false));
afterEach(() => vi.restoreAllMocks());

describe('inkSpan', () => {
  it('boşluklara ve inkWear=0 durumuna dokunmaz', () => {
    expect(inkSpan(' ', 1)).toBeNull();
    expect(inkSpan('a', 0)).toBeNull();
  });

  it('dikey sapma ±0.6px ve opaklık 0.72-1.0 aralığında kalır', () => {
    for (const r of [0, 0.5, 0.999]) {
      const span = inkSpan('a', 1, () => r)!;
      const top = parseFloat(span.style.top);
      expect(Math.abs(top)).toBeLessThanOrEqual(0.6);
      expect(Number(span.style.opacity)).toBeGreaterThanOrEqual(0.72);
      expect(Number(span.style.opacity)).toBeLessThanOrEqual(1);
    }
  });

  it('düşük olasılıkla mürekkep dağılması (text-shadow) ekler', () => {
    const bleed = inkSpan('a', 1, () => 0.01)!;
    expect(bleed.style.textShadow).toMatch(/0?\.4px/);
    const clean = inkSpan('a', 1, () => 0.5)!;
    expect(clean.style.textShadow).toBe('');
  });
});

describe('applyInkWear', () => {
  it('metni, HTML yapısını ve event listener’ları korur', () => {
    const el = mount('<h1>Gece Notları</h1><p>Mekanik <a href="#">tuşların</a> izi.</p>');
    const link = el.querySelector('a')!;
    const onClick = vi.fn();
    link.addEventListener('click', onClick);
    const before = el.textContent;

    applyInkWear(el, 0.5);

    expect(el.textContent).toBe(before);
    expect(el.querySelector('a')).toBe(link);
    link.click();
    expect(onClick).toHaveBeenCalledOnce();
    expect(el.querySelectorAll('.daktilo-ink').length).toBeGreaterThan(0);
  });

  it('kusursuz harfleri tek TextNode olarak birleşik bırakır', () => {
    const el = mount('<p>abcdefghij</p>');
    let call = 0;
    // Yalnızca 5. harf (rand çağrısı #9) kusurlu; diğerleri düz kalır.
    vi.spyOn(Math, 'random').mockImplementation(() => (++call === 9 ? 0 : 0.99));
    applyInkWear(el, 0.35);
    const p = el.querySelector('p')!;
    expect(Array.from(p.childNodes).map((n) => n.textContent)).toEqual(['abcd', 'e', 'fghij']);
  });

  it('script, style ve data-daktilo-ignore içeriğine dokunmaz', () => {
    const el = mount('<p data-daktilo-ignore>sabit</p><style>.x{}</style><p>metin</p>');
    applyInkWear(el, 1);
    expect(el.querySelector('[data-daktilo-ignore]')!.childNodes).toHaveLength(1);
    expect(el.querySelector('style')!.childNodes).toHaveLength(1);
    expect(el.querySelectorAll('p')[1].querySelectorAll('.daktilo-ink')).toHaveLength(5);
  });
});

describe('Daktilo (statik mod)', () => {
  it('tema sınıflarını, CSS değişkenlerini ve stilleri uygular', () => {
    const el = mount('<p>Merhaba</p>');
    new Daktilo('#essay', { paper: 'carbon', ribbonColor: '#ff0000', maxWidth: '50ch', inkWear: 0 });
    expect(el.classList).toContain('daktilo-sheet');
    expect(el.classList).toContain('daktilo-theme-carbon');
    expect(el.style.getPropertyValue('--daktilo-ribbon')).toBe('#ff0000');
    expect(el.style.getPropertyValue('--daktilo-width')).toBe('50ch');
    expect(document.getElementById('daktilo-core-css')).not.toBeNull();
    expect(document.getElementById('daktilo-fonts')).not.toBeNull();
  });

  it('ribbonColor verilmezse temanın şerit rengini ezmez', () => {
    const el = mount('<p>Merhaba</p>');
    new Daktilo(el, { paper: 'clean' });
    expect(el.style.getPropertyValue('--daktilo-ribbon')).toBe('');
  });

  it('stilleri tek sefer enjekte eder ve fonts:false ile font yüklemez', () => {
    document.head.innerHTML = '';
    mount('<p>a</p>');
    new Daktilo('#essay', { fonts: false });
    new Daktilo('#essay', { fonts: false });
    expect(document.querySelectorAll('#daktilo-core-css')).toHaveLength(1);
    expect(document.getElementById('daktilo-fonts')).toBeNull();
  });

  it('NodeList ve dizi hedeflerini kabul eder, eşleşme yoksa hata vermez', () => {
    document.body.innerHTML = '<p class="x">a</p><p class="x">b</p>';
    const d = new Daktilo(document.querySelectorAll('.x'));
    expect(d.elements).toHaveLength(2);
    expect(new Daktilo('#yok').elements).toHaveLength(0);
  });
});
