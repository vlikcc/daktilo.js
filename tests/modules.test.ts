import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DaktiloWriter } from '../src/editor';
import { AZERTY, QWERTY, QWERTZ, TURKISH_F, TURKISH_Q } from '../src/keyboards';
import { neighborKey } from '../src/keyboard';
import daktiloTailwind, { cssToJs, toComponents } from '../src/tailwind';
import { CSS } from '../src/styles';
import { setReducedMotion } from './helpers';

beforeEach(() => setReducedMotion(false));
afterEach(() => vi.restoreAllMocks());

const fakeSound = () => ({ playKeyClick: vi.fn(), playCarriageDing: vi.fn(), dispose: vi.fn(), setVolume: vi.fn() });

const input = (el: Element, inputType: string, data: string | null = null): InputEvent => {
  const event = new InputEvent('beforeinput', { inputType, data, cancelable: true, bubbles: true });
  el.dispatchEvent(event);
  return event;
};

describe('daktilo-js/keyboards', () => {
  it('her düzen en az üç harf satırı içerir ve komşu tuş üretir', () => {
    for (const rows of [TURKISH_Q, TURKISH_F, QWERTY, QWERTZ, AZERTY]) {
      expect(rows).toHaveLength(3);
      expect(neighborKey(rows[1][2], rows, () => 0)).toMatch(/^\p{L}$/u);
    }
  });

  it('QWERTY düzeninde "i" harfinin komşuları İngilizce klavyedeki gibidir', () => {
    const keys = new Set(Array.from({ length: 6 }, (_, i) => neighborKey('i', QWERTY, () => i / 6)));
    expect([...keys].sort()).toEqual(['j', 'k', 'o', 'u']);
  });
});

describe('daktilo-js/editor (Yazar modu)', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '<textarea id="t"></textarea><div id="c"></div>';
  });

  it('textarea alanını kağıda çevirir ve destroy() ile geri alır', () => {
    const el = document.getElementById('t') as HTMLTextAreaElement;
    const writer = new DaktiloWriter(el, { paper: 'carbon', sound: fakeSound() });
    expect(el.classList).toContain('daktilo-sheet');
    expect(el.classList).toContain('daktilo-theme-carbon');
    expect(el.classList).toContain('daktilo-writer');
    expect(document.getElementById('daktilo-writer-css')).not.toBeNull();
    expect(el.getAttribute('spellcheck')).toBe('false');
    writer.destroy();
    expect(el.getAttribute('class')).toBeNull();
    expect(el.hasAttribute('spellcheck')).toBe(false);
  });

  it('tuş, boşluk ve satır sonu seslerini çalar; yapıştırmada sessiz kalır', () => {
    const sound = fakeSound();
    const el = document.getElementById('t')!;
    new DaktiloWriter(el, { sound });
    input(el, 'insertText', 'a');
    input(el, 'insertText', ' ');
    input(el, 'insertLineBreak');
    input(el, 'insertFromPaste');
    expect(sound.playKeyClick.mock.calls).toEqual([[false], [true]]);
    expect(sound.playCarriageDing).toHaveBeenCalledOnce();
  });

  it('motor destekliyorsa Enter’da satır başı sesini çalar', () => {
    const sound = { ...fakeSound(), playCarriageReturn: vi.fn() };
    const el = document.getElementById('t')!;
    new DaktiloWriter(el, { sound });
    input(el, 'insertLineBreak');
    expect(sound.playCarriageReturn).toHaveBeenCalledOnce();
    expect(sound.playCarriageDing).not.toHaveBeenCalled();
  });

  it('noErase ile silme ve geri almayı engeller', () => {
    const el = document.getElementById('t')!;
    new DaktiloWriter(el, { sound: fakeSound(), noErase: true });
    expect(input(el, 'deleteContentBackward').defaultPrevented).toBe(true);
    expect(input(el, 'historyUndo').defaultPrevented).toBe(true);
    expect(input(el, 'insertText', 'a').defaultPrevented).toBe(false);
  });

  it('bellColumn sütununa ulaşınca kenar çanı çalar', () => {
    const sound = fakeSound();
    const el = document.getElementById('t') as HTMLTextAreaElement;
    new DaktiloWriter(el, { sound, bellColumn: 5 });
    el.value = 'satır\nabc';
    el.setSelectionRange(9, 9);
    input(el, 'insertText', 'd');
    expect(sound.playCarriageDing).not.toHaveBeenCalled();
    el.value = 'satır\nabcd';
    el.setSelectionRange(10, 10);
    input(el, 'insertText', 'e');
    expect(sound.playCarriageDing).toHaveBeenCalledOnce();
  });

  it('düz bir elemanı contenteditable yapar ve sonra eski hâline döndürür', () => {
    const el = document.getElementById('c')!;
    const writer = new DaktiloWriter('#c', { sound: fakeSound() });
    expect(el.getAttribute('contenteditable')).toBe('true');
    writer.destroy();
    expect(el.hasAttribute('contenteditable')).toBe(false);
  });

  it('destroy() sonrası ses çalmaz ve motoru kapatır', () => {
    const sound = fakeSound();
    const el = document.getElementById('t')!;
    new DaktiloWriter(el, { sound }).destroy();
    input(el, 'insertText', 'a');
    expect(sound.playKeyClick).not.toHaveBeenCalled();
    expect(sound.dispose).toHaveBeenCalled();
  });
});

describe('daktilo-js/tailwind', () => {
  it('çekirdek CSS’i iç içe at-rule’larla CSS-in-JS nesnesine çevirir', () => {
    const js = cssToJs(CSS);
    expect(js['.daktilo-theme-vintage,.daktilo-theme-auto']).toMatchObject({ '--daktilo-paper': '#f4f1ea' });
    expect(js['@keyframes daktilo-blink']).toEqual({ '50%': { opacity: '0' } });
    expect(js['@media (prefers-reduced-motion:reduce)']).toEqual({ '.daktilo-cursor': { animation: 'none' } });
    expect(js['.daktilo-overstrike[data-strike]::after']).toMatchObject({ content: 'attr(data-strike)' });
  });

  it('Tailwind v4 için @media bloklarını seçicilerin içine taşır', () => {
    const components = toComponents(CSS);
    expect(Object.keys(components).filter((key) => key.startsWith('@media'))).toEqual([]);
    expect(components['.daktilo-cursor']).toMatchObject({
      animation: 'daktilo-blink 1s step-end infinite',
      '@media (prefers-reduced-motion:reduce)': { animation: 'none' },
    });
  });

  it('eklenti bileşenleri addComponents ile ekler ve tema değerleri tanımlar', () => {
    const addComponents = vi.fn();
    daktiloTailwind.handler({ addComponents });
    expect(addComponents).toHaveBeenCalledWith(expect.objectContaining({ '.daktilo-sheet': expect.any(Object) }));
    expect(daktiloTailwind.config.theme.extend.colors.daktilo.ribbon).toBe('var(--daktilo-ribbon)');
  });
});
