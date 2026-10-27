import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Daktilo, type SoundEngine } from '../src';
import { resolveOptions } from '../src/options';
import { mount, setReducedMotion, visibleText } from './helpers';

beforeEach(() => {
  setReducedMotion(false);
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const fakeSound = () => ({
  playKeyClick: vi.fn(),
  playCarriageDing: vi.fn(),
  dispose: vi.fn(),
  setVolume: vi.fn(),
});

async function typeOut(d: Daktilo): Promise<void> {
  await vi.runAllTimersAsync();
  await d.finished;
}

/** Yazım kutusundaki (ekran okuyucu kopyası hariç) metin. */
const typedText = (el: Element): string =>
  el.querySelector('[aria-hidden="true"]:not(.daktilo-cursor)')?.textContent?.replace('█', '') ?? '';

describe('hata düzeltmeleri', () => {
  it('bölünmez boşluğu (&nbsp;) yazımdan sonra korur', async () => {
    const el = mount('<p>10&nbsp;km  yol</p>');
    const d = new Daktilo(el, { animate: true, typoRate: 0, inkWear: 0 });
    await typeOut(d);
    expect(el.querySelector('p')!.textContent).toBe('10 km yol');
  });

  it('birleşik aksanları ve emoji dizilerini tek karakter olarak yazar', async () => {
    const family = '👨‍👩‍👧';
    const el = mount(`<p>é${family}</p>`);
    const chars: string[] = [];
    const d = new Daktilo(el, { animate: true, typoRate: 0, inkWear: 0, onChar: (c) => chars.push(c) });
    await typeOut(d);
    expect(chars).toEqual(['é', family]);
    expect(el.querySelector('p')!.textContent).toBe(`é${family}`);
  });

  it('mürekkep kusuru birleşik aksanı harfinden ayırmaz', () => {
    const el = mount('<p>é</p>');
    new Daktilo(el, { inkWear: 1 });
    const spans = el.querySelectorAll('.daktilo-ink');
    expect(spans).toHaveLength(1);
    expect(spans[0].textContent).toBe('é');
  });

  it('kod, kbd ve pre içinde yazım hatası yapmaz', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const el = mount('<p><code>npm</code> <kbd>Ctrl</kbd></p><pre>ls</pre><p>ab</p>');
    const d = new Daktilo(el, { animate: true, typoRate: 0.2, inkWear: 0 });
    await typeOut(d);
    expect(
      el.querySelectorAll('code .daktilo-overstrike, kbd .daktilo-overstrike, pre .daktilo-overstrike'),
    ).toHaveLength(0);
    expect(el.querySelectorAll('p:last-child .daktilo-overstrike')).toHaveLength(2);
  });

  it('skip() yazılmış kısmı ve mürekkep kusurlarını korur, kalanını aynı biçimde tamamlar', async () => {
    const el = mount('<p>abcdefghijklmnop</p>');
    const d = new Daktilo(el, { animate: true, typoRate: 0, inkWear: 1 });
    await vi.advanceTimersByTimeAsync(150);
    const typed = Array.from(el.querySelectorAll('.daktilo-ink'));
    expect(typed.length).toBeGreaterThan(0);
    d.skip();
    await d.finished;
    expect(typed.every((span) => span.isConnected)).toBe(true);
    expect(el.querySelectorAll('.daktilo-ink').length).toBeGreaterThan(typed.length);
    expect(visibleText(el)).toBe('abcdefghijklmnop');
    expect(el.querySelector('.daktilo-sr')).toBeNull();
  });

  it('satır sarmasını kağıda göre ölçer; sayfa kaydırması yanlış çan çaldırmaz', async () => {
    let scroll = 0;
    let typedChars = 0;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      scroll += 15; // her ölçümde sayfa kaydırılmış gibi içerik aşağı kayar
      const line = this.classList.contains('daktilo-cursor') && typedChars > 5 ? 28 : 0;
      return { top: scroll + line, height: 20 } as DOMRect;
    });
    const onLine = vi.fn();
    const el = mount('<p>abcdefghij</p>');
    const d = new Daktilo(el, { animate: true, typoRate: 0, inkWear: 0, onChar: () => typedChars++, onLine });
    await typeOut(d);
    // Yalnızca 6. harfte gerçek bir satır kayması var.
    expect(onLine).toHaveBeenCalledTimes(1);
  });

  it('seçici hiçbir elemanla eşleşmezse uyarır', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    new Daktilo('#yok');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('#yok'));
  });

  it('undefined verilen seçenekler varsayılanı ezmez', () => {
    const o = resolveOptions({ maxWidth: undefined, fonts: undefined, keyboard: undefined });
    expect(o.maxWidth).toBe('65ch');
    expect(o.fonts).toBe(true);
    expect(o.keyboard.length).toBeGreaterThan(0);
  });
});

describe('oynatma denetimi', () => {
  it('pause() yazımı durdurur, resume() kaldığı yerden sürdürür', async () => {
    const el = mount('<p>abcdefghij</p>');
    const d = new Daktilo(el, { animate: true, typoRate: 0, inkWear: 0, speed: 20 });
    await vi.advanceTimersByTimeAsync(60);
    d.pause();
    expect(d.paused).toBe(true);
    await vi.advanceTimersByTimeAsync(50);
    const frozen = typedText(el);
    await vi.advanceTimersByTimeAsync(5000);
    expect(typedText(el)).toBe(frozen);
    expect(frozen.length).toBeLessThan(10);

    d.resume();
    await typeOut(d);
    expect(el.querySelector('p')!.textContent).toBe('abcdefghij');
  });

  it('duraklatılmışken skip() yine tamamlar', async () => {
    const el = mount('<p>abcdefghij</p>');
    const d = new Daktilo(el, { animate: true, typoRate: 0, inkWear: 0 });
    d.pause();
    d.skip();
    await d.finished;
    expect(el.querySelector('p')!.textContent).toBe('abcdefghij');
  });

  it('muted iken ses çalmaz, setVolume() motora iletilir', async () => {
    const sound = fakeSound();
    const el = mount('<p>ab</p><p>cd</p>');
    const d = new Daktilo(el, { animate: true, typoRate: 0, inkWear: 0, sound: sound as SoundEngine });
    d.muted = true;
    d.setVolume(0.7);
    await typeOut(d);
    expect(sound.playKeyClick).not.toHaveBeenCalled();
    expect(sound.playCarriageDing).not.toHaveBeenCalled();
    expect(sound.setVolume).toHaveBeenCalledWith(0.7);
  });
});

describe('olaylar', () => {
  it('onChar her tuşta, onLine satır başında, onComplete bir kez çağrılır', async () => {
    const onChar = vi.fn();
    const onLine = vi.fn();
    const onComplete = vi.fn();
    const el = mount('<h1>Ab</h1>\n  <p>C d</p>');
    const d = new Daktilo(el, { animate: true, typoRate: 0, inkWear: 0, onChar, onLine, onComplete });
    await typeOut(d);
    expect(onChar.mock.calls.map(([c]) => c).join('')).toBe('AbC d');
    expect(onChar).toHaveBeenCalledWith('A', el);
    expect(onLine).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('atlanan karakterler için onChar çağrılmaz', async () => {
    const onChar = vi.fn();
    const el = mount('<p>abcdefghij</p>');
    const d = new Daktilo(el, { animate: true, typoRate: 0, inkWear: 0, onChar });
    d.skip();
    await typeOut(d);
    expect(onChar).not.toHaveBeenCalled();
  });

  it('destroy() edilen örnekte onComplete çağrılmaz', async () => {
    const onComplete = vi.fn();
    const d = new Daktilo(mount('<p>abc</p>'), { animate: true, onComplete });
    d.destroy();
    await typeOut(d);
    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe('type()', () => {
  it('önceki yazım bittikten sonra yeni paragrafı yazar', async () => {
    // Gecikme rastgeledir; sabitlenmezse "Bir" nadiren 80 ms'den kısa sürer.
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const el = mount('<p>Bir</p>');
    const d = new Daktilo(el, { animate: true, typoRate: 0, inkWear: 0 });
    const next = d.type('İki');
    await vi.advanceTimersByTimeAsync(80);
    expect(el.querySelectorAll('p')).toHaveLength(1);
    await vi.runAllTimersAsync();
    await next;
    expect(el.innerHTML).toBe('<p>Bir</p><p>İki</p>');
    expect(el.hasAttribute('aria-busy')).toBe(false);
  });

  it('skip() sırada bekleyen yazımları da tamamlar', async () => {
    const el = mount('<p>Bir</p>');
    const d = new Daktilo(el, { animate: true, typoRate: 0, inkWear: 0 });
    const next = d.type(Object.assign(document.createElement('h2'), { textContent: 'Başlık' }));
    d.skip();
    await next;
    expect(el.innerHTML).toBe('<p>Bir</p><h2>Başlık</h2>');
  });

  it('animasyon kapalıyken içeriği mürekkep kusuruyla hemen ekler', async () => {
    const el = mount('<p>Bir</p>');
    const d = new Daktilo(el, { inkWear: 1 });
    await d.type('İki');
    expect(visibleText(el)).toBe('Birİki');
    expect(el.querySelectorAll('p')[1].querySelectorAll('.daktilo-ink')).toHaveLength(3);
  });

  it('destroy() eklenen içeriği de kaldırır', async () => {
    const el = mount('<p>Bir</p>');
    const d = new Daktilo(el, { inkWear: 0 });
    await d.type('İki');
    d.destroy();
    expect(el.innerHTML).toBe('<p>Bir</p>');
  });
});

describe('startOnVisible ve autoScroll', () => {
  it('kağıt ekrana girene kadar yazmaya başlamaz', async () => {
    let notify: (entries: Array<{ isIntersecting: boolean }>) => void = () => undefined;
    const disconnect = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: typeof notify) {
          notify = callback;
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    const el = mount('<p>abc</p>');
    const d = new Daktilo(el, { animate: true, typoRate: 0, inkWear: 0, startOnVisible: true });
    await vi.advanceTimersByTimeAsync(2000);
    expect(typedText(el)).toBe('');

    notify([{ isIntersecting: true }]);
    await typeOut(d);
    expect(el.innerHTML).toBe('<p>abc</p>');
    expect(disconnect).toHaveBeenCalled();
  });

  it('autoScroll satır başlarında imleci görünür tutar', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const d = new Daktilo(mount('<p>a</p><p>b</p>'), { animate: true, typoRate: 0, inkWear: 0, autoScroll: true });
    await typeOut(d);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    delete (Element.prototype as Partial<Element>).scrollIntoView;
  });
});

describe('i18n', () => {
  it('yazım hatasını verilen klavye düzeninden seçer', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const el = mount('<p>s</p>');
    const d = new Daktilo(el, { animate: true, typoRate: 0.2, inkWear: 0, keyboard: ['qwe', 'asd', 'zxc'] });
    await typeOut(d);
    expect(['a', 'd', 'w', 'e', 'z', 'x']).toContain(el.querySelector('.daktilo-overstrike')!.textContent);
  });

  it('damga etiketlerini ve tarih yerel ayarını değiştirir', () => {
    const el = mount('<p>Text</p>');
    new Daktilo(el, {
      inkWear: 0,
      stamp: { docNo: '#7', author: 'V. K.', labels: { docNo: 'REF', date: 'DATE', author: 'BY' }, locale: 'en-US' },
    });
    const today = new Date().toLocaleDateString('en-US');
    expect(el.querySelector('.daktilo-meta-header')!.textContent).toBe(`REF: #7 // DATE: ${today} // BY: V. K.`);
  });
});

describe('stiller ve fontlar', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('fonts bir URL ise fontları oradan yükler', () => {
    new Daktilo(mount('<p>a</p>'), { fonts: '/fonts/daktilo.css' });
    expect(document.querySelector<HTMLLinkElement>('#daktilo-fonts')!.getAttribute('href')).toBe('/fonts/daktilo.css');
  });

  it('styles:false ile <style> eklemez (katı CSP)', () => {
    new Daktilo(mount('<p>a</p>'), { styles: false, fonts: false });
    expect(document.getElementById('daktilo-core-css')).toBeNull();
  });
});

describe('küçük kusur düzeltmeleri', () => {
  it('aynı elemanı başka bir örnek devralırsa eski örnek onComplete çağırmaz', async () => {
    const onComplete = vi.fn();
    const el = mount('<p>abc</p>');
    const first = new Daktilo(el, { animate: true, onComplete });
    new Daktilo(el, { inkWear: 0 });
    await typeOut(first);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('setSound() sesi sonradan açar, motor değiştirir ve eskisini kapatır', async () => {
    const first = fakeSound();
    const second = fakeSound();
    const d = new Daktilo(mount('<p>ab</p>'), { animate: true, typoRate: 0, inkWear: 0 });
    d.setSound(first as SoundEngine);
    await vi.advanceTimersByTimeAsync(5);
    expect(first.playKeyClick).toHaveBeenCalled();
    d.setSound(second as SoundEngine);
    expect(first.dispose).toHaveBeenCalled();
    await typeOut(d);
    expect(second.playKeyClick).toHaveBeenCalled();
    d.setSound(false);
    expect(second.dispose).toHaveBeenCalled();
  });

  it('fonts:false ile başlayan örnek, sonraki fonts:true örneğinin font beklemesini atlatmaz', async () => {
    vi.resetModules();
    const { Daktilo: Fresh } = await import('../src');
    document.head.innerHTML = '';
    document.body.innerHTML = '<article id="a"><p>a</p></article><article id="b"><p>bcd</p></article>';
    Object.defineProperty(document, 'fonts', { value: { load: vi.fn(async () => []) }, configurable: true });
    try {
      new Fresh('#a', { animate: true, fonts: false, inkWear: 0 });
      const b = new Fresh('#b', { animate: true, fonts: true, inkWear: 0, typoRate: 0 });
      await vi.advanceTimersByTimeAsync(500);
      // Font bağlantısı yüklenmeden yazım başlamaz: paragraf henüz kağıda yerleşmemiştir.
      expect(document.querySelector('#b p')).toBeNull();
      expect(document.querySelector('#b .daktilo-cursor')).not.toBeNull();
      document.getElementById('daktilo-fonts')!.dispatchEvent(new Event('load'));
      await typeOut(b as unknown as Daktilo);
      expect(document.querySelector('#b p')!.textContent).toBe('bcd');
    } finally {
      delete (document as { fonts?: unknown }).fonts;
    }
  });
});

describe('kağıt teması seçenekleri', () => {
  it("paper: 'auto' sistem temasını izleyen sınıfı ekler", () => {
    const el = mount('<p>a</p>');
    new Daktilo(el, { paper: 'auto', inkWear: 0 });
    expect(el.classList).toContain('daktilo-theme-auto');
  });

  it('özel renkler CSS değişkenlerini ezer ve destroy() ile geri alınır', () => {
    const el = mount('<p>a</p>');
    el.setAttribute('style', 'color: red;');
    const d = new Daktilo(el, { paper: { paper: '#fffbe6', ink: 'navy' }, inkWear: 0 });
    expect(el.classList).toContain('daktilo-theme-vintage');
    expect(el.style.getPropertyValue('--daktilo-paper')).toBe('#fffbe6');
    expect(el.style.getPropertyValue('--daktilo-ink')).toBe('navy');
    d.destroy();
    expect(el.getAttribute('style')).toBe('color: red;');
  });

  it('geçersiz tema adında vintage’a döner', () => {
    expect(resolveOptions({ paper: 'papyrus' as never }).paper).toBe('vintage');
  });
});

describe('kenar çanı ve satır başı', () => {
  /** Kutunun sağ kenarı 200 px; her harf 10 px genişliğinde ve imleç her vuruşta sağa kayar. */
  function layout(typed: () => number, lineAt = Infinity) {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      if (!this.classList.contains('daktilo-cursor')) return { top: 0, right: 200, height: 0, width: 200 } as DOMRect;
      const n = typed();
      const line = n >= lineAt ? 1 : 0;
      const col = line ? n - lineAt : n;
      return { top: line * 28, right: 10 * (col + 1), height: 20, width: 10 } as DOMRect;
    });
  }

  it('sağ kenara 6 karakter kala çanı satır başına bir kez çalar', async () => {
    let typed = 0;
    layout(() => typed);
    const sound = fakeSound();
    const d = new Daktilo(mount('<p>abcdefghijklmnopqr</p>'), {
      animate: true,
      typoRate: 0,
      inkWear: 0,
      sound: sound as SoundEngine,
      onChar: () => typed++,
    });
    await typeOut(d);
    // 200 px'lik satırda imleç 14. harften sonra (right = 150) kenara 60 px'ten yakın olur.
    expect(sound.playCarriageDing).toHaveBeenCalledOnce();
  });

  it('yeni satırda satır başı sesini çalar ve çanı yeniden kurar', async () => {
    let typed = 0;
    layout(() => typed, 17);
    const sound = { ...fakeSound(), playCarriageReturn: vi.fn() };
    const d = new Daktilo(mount('<p>abcdefghijklmnopqrstuvwxyzabcdefgh</p>'), {
      animate: true,
      typoRate: 0,
      inkWear: 0,
      sound: sound as SoundEngine,
      onChar: () => typed++,
    });
    await typeOut(d);
    expect(sound.playCarriageReturn).toHaveBeenCalledOnce();
    // İlk satırda bir, sarmadan sonra ikinci satırda bir çan.
    expect(sound.playCarriageDing).toHaveBeenCalledTimes(2);
  });

  it('paragraf geçişlerinde çan değil satır başı sesi çalar', async () => {
    const sound = { ...fakeSound(), playCarriageReturn: vi.fn() };
    const d = new Daktilo(mount('<p>a</p><p>b</p><p>c</p>'), {
      animate: true,
      typoRate: 0,
      inkWear: 0,
      sound: sound as SoundEngine,
    });
    await typeOut(d);
    expect(sound.playCarriageReturn).toHaveBeenCalledTimes(2);
    expect(sound.playCarriageDing).not.toHaveBeenCalled();
  });
});
