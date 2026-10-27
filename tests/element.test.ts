import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DaktiloSheetElement, defineDaktiloElement, optionsFromAttributes } from '../src/element';
import { QWERTY } from '../src/keyboards';
import { setReducedMotion } from './helpers';

beforeEach(() => {
  setReducedMotion(false);
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

const html = (markup: string): HTMLElement => {
  const host = document.createElement('div');
  host.innerHTML = markup;
  return host.firstElementChild as HTMLElement;
};

describe('optionsFromAttributes', () => {
  it('metin, sayı ve bayrak özniteliklerini seçeneklere çevirir', () => {
    const el = html(
      '<daktilo-sheet paper="carbon" ribbon-color="#f00" ink-wear="0.5" speed="20" typo-rate="x" animate sound="false" auto-scroll></daktilo-sheet>',
    );
    expect(optionsFromAttributes(el)).toEqual({
      paper: 'carbon',
      ribbonColor: '#f00',
      inkWear: 0.5,
      speed: 20,
      animate: true,
      sound: false,
      autoScroll: true,
    });
  });

  it('klavye adını hazır düzene, fonts değerini bayrağa veya URL’ye çevirir', () => {
    expect(optionsFromAttributes(html('<x keyboard="QWERTY" fonts="false"></x>'))).toEqual({
      keyboard: QWERTY,
      fonts: false,
    });
    expect(optionsFromAttributes(html('<x fonts="/f.css"></x>')).fonts).toBe('/f.css');
    expect(optionsFromAttributes(html('<x fonts></x>')).fonts).toBe(true);
  });

  it('stamp-* özniteliklerinden evrak damgası oluşturur', () => {
    const el = html('<x stamp-doc-no="#7" stamp-classification="DRAFT" stamp-labels="REF, DATE, BY"></x>');
    expect(optionsFromAttributes(el).stamp).toEqual({
      docNo: '#7',
      classification: 'DRAFT',
      labels: { docNo: 'REF', date: 'DATE', author: 'BY' },
    });
    expect(optionsFromAttributes(html('<x stamp></x>')).stamp).toEqual({});
    expect(optionsFromAttributes(html('<x></x>')).stamp).toBeUndefined();
  });
});

describe('<daktilo-sheet>', () => {
  it('içe aktarıldığında kendini kaydeder ve kağıda çevirir', () => {
    expect(customElements.get('daktilo-sheet')).toBeDefined();
    document.body.innerHTML = '<daktilo-sheet paper="clean" ink-wear="0"><p>Merhaba</p></daktilo-sheet>';
    const el = document.querySelector('daktilo-sheet')!;
    expect(el).toBeInstanceOf(DaktiloSheetElement);
    expect(el.classList).toContain('daktilo-theme-clean');
    expect(el.daktilo).not.toBeNull();
    expect(document.head.textContent).toContain('daktilo-sheet{display:block}');
  });

  it('daktilo-char, daktilo-line ve daktilo-complete olaylarını yayar', async () => {
    const events: string[] = [];
    document.body.addEventListener('daktilo-char', (e) => events.push((e as CustomEvent).detail.char));
    document.body.addEventListener('daktilo-line', () => events.push('⏎'));
    document.body.addEventListener('daktilo-complete', () => events.push('✓'));
    document.body.innerHTML = '<daktilo-sheet animate ink-wear="0" typo-rate="0"><p>ab</p><p>c</p></daktilo-sheet>';
    await vi.runAllTimersAsync();
    await document.querySelector('daktilo-sheet')!.finished;
    await Promise.resolve();
    expect(events.join('')).toBe('ab⏎c✓');
  });

  it('öznitelik değişince yeniden başlar, sayfadan çıkınca içeriği geri yükler', () => {
    document.body.innerHTML = '<daktilo-sheet paper="vintage" ink-wear="0"><p>Metin</p></daktilo-sheet>';
    const el = document.querySelector('daktilo-sheet')!;
    const first = el.daktilo;
    el.setAttribute('paper', 'carbon');
    expect(el.daktilo).not.toBe(first);
    expect(el.classList).toContain('daktilo-theme-carbon');
    expect(el.classList).not.toContain('daktilo-theme-vintage');

    el.remove();
    expect(el.daktilo).toBeNull();
    expect(el.getAttribute('class')).toBeNull();
    expect(el.innerHTML).toBe('<p>Metin</p>');
  });

  it('skip(), pause(), resume() ve type() örneğe iletilir', async () => {
    document.body.innerHTML = '<daktilo-sheet animate ink-wear="0" typo-rate="0"><p>abcdef</p></daktilo-sheet>';
    const el = document.querySelector('daktilo-sheet')!;
    el.pause();
    expect(el.daktilo!.paused).toBe(true);
    el.resume();
    const typed = el.type('yeni');
    el.skip();
    await typed;
    expect(el.querySelectorAll('p')).toHaveLength(2);
  });

  it('başka bir etiket adıyla da kaydedilebilir', () => {
    defineDaktiloElement('my-paper');
    document.body.innerHTML = '<my-paper ink-wear="0"><p>x</p></my-paper>';
    expect(document.querySelector('my-paper')!.classList).toContain('daktilo-sheet');
    expect(document.head.textContent).toContain('my-paper{display:block}');
  });
});
