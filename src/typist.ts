import { COLLAPSIBLE, graphemes, isSkipped } from './dom';
import { inkSpan } from './ink';
import { neighborKey } from './keyboard';
import type { ResolvedOptions, SoundEngine } from './types';

const CANCELLED = Symbol('daktilo-cancelled');
const LETTER = /\p{L}/u;
const SPACE = /\s/;
/** Daraltılan (görünmez ardışık) boşluk; bölünmez boşluk görünür kaldığı için hariçtir. */
const COLLAPSIBLE_CHAR = /^[ \t\n\r\f]+$/;
/** İçinde yazım hatası yapılmayan elemanlar: kod ve klavye girdisi birebir korunur. */
const NO_TYPOS = 'code,kbd,samp,pre';

const isBlock = (el: Element): boolean => !/^(inline|contents|none)/.test(getComputedStyle(el).display);

const preservesWhitespace = (el: Element | null): boolean =>
  !!el && (/^(pre|break-spaces)/.test(getComputedStyle(el).whiteSpace) || !!el.closest('pre'));

/**
 * Orijinal düğümleri (elemanlar ve listener'ları dahil) imlecin önüne yeniden yerleştirerek
 * içeriği harf harf yazar. Hatalı harfler silinmez, üzerine overstrike karakteri basılır.
 */
export class Typist {
  #opts: ResolvedOptions;
  #sound: SoundEngine;
  /** Kağıt elemanı: satır ölçümü ve olaylar bu elemana göredir. */
  readonly sheet: HTMLElement;
  /** `finish()` veya `cancel()` sonrası kalan metin beklemesiz ve sessiz yazılır. */
  #fast = false;
  #cancelled = false;
  #paused = false;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #wake: (() => void) | null = null;
  #cursor = document.createElement('span');
  /** İmlecin hemen önündeki, yeni düz harflerin eklendiği metin düğümü. */
  #text: Text | null = null;
  #prev = '\n';
  #typedAny = false;
  #pendingReturn = false;
  #lineTop = NaN;

  constructor(opts: ResolvedOptions, sound: SoundEngine, sheet: HTMLElement) {
    this.#opts = opts;
    this.#sound = sound;
    this.sheet = sheet;
    this.#cursor.className = 'daktilo-cursor';
    this.#cursor.setAttribute('aria-hidden', 'true');
    this.#cursor.textContent = '█';
  }

  /** `nodes` kökten ayrılmış orijinal çocuklardır; yazım `start` çözülünce başlar. İptal edilirse false döner. */
  async type(root: Element, nodes: Node[], start?: Promise<unknown>): Promise<boolean> {
    root.append(this.#cursor);
    try {
      if (start) await this.#wait(start);
      for (const node of nodes) await this.#typeNode(node);
      return true;
    } catch (error) {
      if (error === CANCELLED) return false;
      throw error;
    } finally {
      this.#cursor.remove();
    }
  }

  pause(): void {
    this.#paused = true;
  }

  resume(): void {
    if (!this.#paused) return;
    this.#paused = false;
    this.#wake?.();
  }

  /** Kalan metni anında, sessizce ve aynı mürekkep kusurlarıyla yazar. */
  finish(): void {
    this.#fast = true;
    clearTimeout(this.#timer);
    this.#wake?.();
  }

  cancel(): void {
    this.#cancelled = true;
    this.finish();
  }

  /** Süre (ms) veya söz kadar, ardından duraklatıldıysa devam ettirilene kadar bekler. */
  async #wait(until: number | Promise<unknown>): Promise<void> {
    let first: number | Promise<unknown> | undefined = until;
    while (!this.#fast && (first !== undefined || this.#paused)) {
      await new Promise<void>((resolve) => {
        this.#wake = resolve;
        if (typeof first === 'number') this.#timer = setTimeout(resolve, first);
        else void first?.then(() => resolve());
      });
      first = undefined;
    }
    if (this.#cancelled) throw CANCELLED;
  }

  #place(node: Node): void {
    this.#cursor.before(node);
    this.#text = null;
  }

  async #typeNode(node: Node): Promise<void> {
    if (node.nodeType === Node.TEXT_NODE) return this.#typeText(node as Text);
    if (node.nodeType !== Node.ELEMENT_NODE) return this.#place(node);

    const el = node as Element;
    if (isSkipped(el) || !el.hasChildNodes()) {
      this.#place(el);
      if (el.localName === 'br') this.#markReturn();
      return;
    }

    const kids = Array.from(el.childNodes);
    el.replaceChildren();
    this.#place(el);
    el.append(this.#cursor);
    const block = isBlock(el);
    if (block) this.#markReturn();
    for (const kid of kids) await this.#typeNode(kid);
    el.after(this.#cursor);
    this.#text = null;
    if (block) this.#markReturn();
  }

  async #typeText(node: Text): Promise<void> {
    const parent = this.#cursor.parentElement;
    const pre = preservesWhitespace(parent);
    const typos = !parent?.closest(NO_TYPOS);
    const raw = node.nodeValue ?? '';
    node.nodeValue = '';
    this.#place(node);
    this.#text = node;
    for (const char of graphemes(pre ? raw : raw.replace(COLLAPSIBLE, ' '))) await this.#typeChar(char, pre, typos);
  }

  async #typeChar(char: string, pre: boolean, typos: boolean): Promise<void> {
    if (pre && char.includes('\n')) {
      this.#write(char, false);
      return this.#carriageReturn();
    }
    // Satır başındaki ve ardışık boşluklar görünmez; tuşlanmadan eklenir.
    const collapsible = !pre && COLLAPSIBLE_CHAR.test(char);
    if (collapsible && (this.#pendingReturn || COLLAPSIBLE_CHAR.test(this.#prev))) {
      this.#write(char, false);
      return;
    }
    if (this.#pendingReturn) {
      this.#pendingReturn = false;
      await this.#carriageReturn();
    }
    if (typos && !this.#fast && LETTER.test(char) && Math.random() < this.#opts.typoRate) await this.#overstrike(char);

    this.#write(char, true);
    this.#typedAny = true;
    if (this.#fast) {
      this.#prev = char;
      return;
    }
    this.#sound.playKeyClick(SPACE.test(char));
    this.#opts.onChar?.(char, this.sheet);
    const delay = this.#delay(char);
    this.#prev = char;
    if (this.#wrapped()) {
      await this.#carriageReturn();
      this.#prev = char;
    }
    await this.#wait(delay);
  }

  #write(char: string, ink: boolean): void {
    const span = ink ? inkSpan(char, this.#opts.inkWear) : null;
    if (span) {
      this.#place(span);
    } else if (this.#text) {
      this.#text.appendData(char);
    } else {
      this.#text = document.createTextNode(char);
      this.#cursor.before(this.#text);
    }
  }

  /** Yanlış (komşu) tuşa basılır, yazar fark edip geri gelir ve üzerine overstrike karakteri basar. */
  async #overstrike(char: string): Promise<void> {
    const typo = document.createElement('span');
    typo.className = 'daktilo-overstrike';
    typo.setAttribute('aria-hidden', 'true');
    typo.textContent = neighborKey(char, this.#opts.keyboard);
    this.#place(typo);
    this.#sound.playKeyClick(false);
    await this.#wait(Math.max(150, this.#opts.speed * 2.5));
    typo.dataset.strike = this.#opts.overstrikeChar;
    if (this.#fast) return;
    this.#sound.playKeyClick(false);
    await this.#wait(this.#opts.speed * 1.8);
  }

  #markReturn(): void {
    if (this.#typedAny) this.#pendingReturn = true;
  }

  async #carriageReturn(): Promise<void> {
    this.#prev = '\n';
    this.#lineTop = NaN;
    if (this.#fast) return;
    this.#sound.playCarriageDing();
    this.#opts.onLine?.(this.sheet);
    if (this.#opts.autoScroll) this.#cursor.scrollIntoView?.({ block: 'nearest' });
    await this.#wait(this.#opts.speed * 4);
  }

  /** İmleç bir alt satıra geçtiyse (metin sarıldıysa) true döner. Konum kağıda göre ölçülür; kaydırma etkilemez. */
  #wrapped(): boolean {
    const rect = this.#cursor.getBoundingClientRect();
    const top = rect.top - this.sheet.getBoundingClientRect().top;
    const wrapped = top - this.#lineTop > Math.max(4, rect.height * 0.6);
    this.#lineTop = top;
    return wrapped;
  }

  /** İnsan ritmi: kelime içinde hızlanır, noktalama işaretlerinde duraksar. */
  #delay(char: string): number {
    const { speed } = this.#opts;
    let ms = speed * (0.6 + Math.random() * 0.8);
    if (LETTER.test(char) && LETTER.test(this.#prev)) ms *= 0.75;
    if ('.!?…'.includes(char)) ms += speed * 6;
    else if (',;:'.includes(char)) ms += speed * 3;
    return ms;
  }
}
