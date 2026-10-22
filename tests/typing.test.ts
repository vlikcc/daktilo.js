import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Daktilo } from '../src';
import { mount, setReducedMotion, visibleText } from './helpers';

beforeEach(() => {
  setReducedMotion(false);
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function typeOut(d: Daktilo): Promise<void> {
  await vi.runAllTimersAsync();
  await d.finished;
}

describe('yazım animasyonu', () => {
  it('içeriği harf harf yazar ve HTML yapısını korur', async () => {
    const el = mount('<h1>Gece</h1><p>Mekanik <em>tuşlar</em>.</p>');
    const d = new Daktilo(el, { animate: true, typoRate: 0, inkWear: 0 });

    expect(el.getAttribute('aria-busy')).toBe('true');
    expect(el.querySelector('.daktilo-cursor')).not.toBeNull();
    await vi.advanceTimersByTimeAsync(200);
    expect(el.textContent!.length).toBeLessThan('GeceMekanik tuşlar.'.length + 1);

    await typeOut(d);
    expect(el.innerHTML).toBe('<h1>Gece</h1><p>Mekanik <em>tuşlar</em>.</p>');
    expect(el.hasAttribute('aria-busy')).toBe(false);
    expect(el.querySelector('.daktilo-cursor')).toBeNull();
  });

  it('elemanların event listener’larını korur', async () => {
    const el = mount('<p><button>Tıkla</button></p>');
    const button = el.querySelector('button')!;
    const onClick = vi.fn();
    button.addEventListener('click', onClick);
    const d = new Daktilo(el, { animate: true, typoRate: 0, inkWear: 0 });
    await typeOut(d);
    el.querySelector('button')!.click();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('overstrike: hatalı harfi silmez, üzerine x basar ve doğru harfle devam eder', async () => {
    const el = mount('<p>daktilo</p>');
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const d = new Daktilo(el, { animate: true, typoRate: 0.2, inkWear: 0, overstrikeChar: '-' });
    await typeOut(d);

    const typos = el.querySelectorAll<HTMLElement>('.daktilo-overstrike');
    expect(typos).toHaveLength(7);
    typos.forEach((typo) => {
      expect(typo.dataset.strike).toBe('-');
      expect(typo.getAttribute('aria-hidden')).toBe('true');
    });
    expect(visibleText(el)).toBe('daktilo');
  });

  it('noktalama işaretlerinde duraksar', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const timings: number[] = [];
    for (const text of ['abc', 'a.c']) {
      const el = mount(`<p>${text}</p>`);
      const d = new Daktilo(el, { animate: true, typoRate: 0, inkWear: 0, speed: 10 });
      const start = Date.now();
      await typeOut(d);
      timings.push(Date.now() - start);
    }
    expect(timings[1]).toBeGreaterThan(timings[0] + 50);
  });

  it('pre içinde boşlukları ve satır sonlarını korur', async () => {
    const el = mount('<pre>a  b\nc</pre>');
    const d = new Daktilo(el, { animate: true, typoRate: 0, inkWear: 0 });
    await typeOut(d);
    expect(el.querySelector('pre')!.textContent).toBe('a  b\nc');
  });

  it('skip() animasyonu anında tamamlar ve damgayı korur', async () => {
    const el = mount('<p>Uzun bir metin</p>');
    const d = new Daktilo(el, { animate: true, inkWear: 0, stamp: { classification: 'GİZLİ' } });
    await vi.advanceTimersByTimeAsync(100);
    d.skip();
    await d.finished;
    expect(visibleText(el)).toBe('Uzun bir metin');
    expect(el.querySelector('.daktilo-stamp-box')!.textContent).toBe('GİZLİ');
    expect(el.querySelector('.daktilo-cursor')).toBeNull();
    expect(el.hasAttribute('aria-busy')).toBe(false);
  });

  it('prefers-reduced-motion aktifken animasyonu devre dışı bırakır', async () => {
    setReducedMotion(true);
    const el = mount('<p>Merhaba</p>');
    new Daktilo(el, { animate: true, inkWear: 0 });
    expect(el.innerHTML).toBe('<p>Merhaba</p>');
    expect(el.hasAttribute('aria-busy')).toBe(false);
  });

  it('respectReducedMotion:false ile tercihi yok sayar', () => {
    setReducedMotion(true);
    const el = mount('<p>Merhaba</p>');
    new Daktilo(el, { animate: true, respectReducedMotion: false });
    expect(el.getAttribute('aria-busy')).toBe('true');
  });
});

describe('destroy ve yeniden başlatma', () => {
  it('destroy() elemanı tamamen orijinal hâline döndürür', async () => {
    const el = mount('<p class="giris">Mekanik <a href="#">tuşlar</a></p>');
    el.setAttribute('style', 'color: red;');
    const original = el.outerHTML;
    const link = el.querySelector('a');

    const d = new Daktilo(el, { animate: true, stamp: { docNo: '#1' }, inkWear: 1 });
    await vi.advanceTimersByTimeAsync(300);
    d.destroy();
    await d.finished;
    await vi.runAllTimersAsync();

    expect(el.outerHTML).toBe(original);
    expect(el.querySelector('a')).toBe(link);
  });

  it('aynı elemanda yeni örnek oluşturulursa önceki örnek temizlenir', () => {
    const el = mount('<p>Merhaba</p>');
    const first = new Daktilo(el, { paper: 'vintage', inkWear: 1 });
    new Daktilo(el, { paper: 'carbon', inkWear: 0 });

    expect(el.classList).not.toContain('daktilo-theme-vintage');
    expect(el.classList).toContain('daktilo-theme-carbon');
    expect(el.innerHTML).toBe('<p>Merhaba</p>');

    first.destroy();
    expect(el.classList).toContain('daktilo-theme-carbon');
  });
});
