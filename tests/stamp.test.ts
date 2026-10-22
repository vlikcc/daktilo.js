import { beforeEach, describe, expect, it } from 'vitest';
import { Daktilo } from '../src';
import { mount, setReducedMotion } from './helpers';

beforeEach(() => setReducedMotion(false));

describe('evrak damgası', () => {
  it('kayıt no, tarih, yazar ve gizlilik derecesini başa ekler', () => {
    const el = mount('<p>Metin</p>');
    new Daktilo(el, {
      inkWear: 0,
      stamp: { docNo: '#84-A', date: '22.10.2026', author: 'V. K.', classification: 'ARŞİV' },
    });
    const header = el.firstElementChild!;
    expect(header.className).toBe('daktilo-meta-header');
    expect(header.firstElementChild!.textContent).toBe('KAYIT: #84-A // TARİH: 22.10.2026 // YAZAN: V. K.');
    expect(header.querySelector('.daktilo-stamp-box')!.textContent).toBe('ARŞİV');
  });

  it('varsayılan kayıt numarası ve bugünün tarihini kullanır', () => {
    const el = mount('<p>Metin</p>');
    new Daktilo(el, { inkWear: 0, stamp: {} });
    const today = new Date().toLocaleDateString('tr-TR');
    expect(el.querySelector('.daktilo-meta-header')!.textContent).toBe(`KAYIT: #001 // TARİH: ${today}`);
    expect(el.querySelector('.daktilo-stamp-box')).toBeNull();
  });

  it('damga alanlarını HTML olarak yorumlamaz (XSS)', () => {
    const el = mount('<p>Metin</p>');
    new Daktilo(el, { inkWear: 0, stamp: { docNo: '<img src=x onerror=alert(1)>', classification: '<b>X</b>' } });
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('b')).toBeNull();
    expect(el.querySelector('.daktilo-stamp-box')!.textContent).toBe('<b>X</b>');
  });
});
