import type { MechanicalSoundEngine } from './audio';
import { isSkipped } from './dom';
import { inkSpan } from './ink';
import { neighborKey } from './keyboard';
import type { ResolvedOptions } from './types';

const CANCELLED = Symbol('daktilo-cancelled');
const LETTER = /\p{L}/u;
const SPACE = /\s/;

const isBlock = (el: Element): boolean => !/^(inline|contents|none)/.test(getComputedStyle(el).display);

const preservesWhitespace = (el: Element | null): boolean =>
  !!el && (/^(pre|break-spaces)/.test(getComputedStyle(el).whiteSpace) || !!el.closest('pre'));

/**
 * Orijinal düğümleri (elemanlar ve listener'ları dahil) imlecin önüne yeniden yerleştirerek
 * içeriği harf harf yazar. Hatalı harfler silinmez, üzerine overstrike karakteri basılır.
 */
export class Typist {
  #opts: ResolvedOptions;
  #sound: MechanicalSoundEngine;
  #cancelled = false;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #wake: (() => void) | null = null;
  #cursor = document.createElement('span');
  /** İmlecin hemen önündeki, yeni düz harflerin eklendiği metin düğümü. */
  #text: Text | null = null;
  #prev = '\n';
  #typedAny = false;
  #pendingReturn = false;
  #lineTop = NaN;

  constructor(opts: ResolvedOptions, sound: MechanicalSoundEngine) {
    this.#opts = opts;
    this.#sound = sound;
    this.#cursor.className = 'daktilo-cursor';
    this.#cursor.setAttribute('aria-hidden', 'true');
    this.#cursor.textContent = '█';
  }

  /** `nodes` kökten ayrılmış orijinal çocuklardır. İptal edilirse false döner. */
  async type(root: Element, nodes: Node[]): Promise<boolean> {
    root.append(this.#cursor);
    try {
      for (const node of nodes) await this.#typeNode(node);
      return true;
    } catch (error) {
      if (error === CANCELLED) return false;
      throw error;
    } finally {
      this.#cursor.remove();
    }
  }

  cancel(): void {
    this.#cancelled = true;
    clearTimeout(this.#timer);
    this.#wake?.();
  }

  async #sleep(ms: number): Promise<void> {
    if (!this.#cancelled) {
      await new Promise<void>((resolve) => {
        this.#wake = resolve;
        this.#timer = setTimeout(resolve, ms);
      });
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
    const pre = preservesWhitespace(this.#cursor.parentElement);
    const raw = node.nodeValue ?? '';
    node.nodeValue = '';
    this.#place(node);
    this.#text = node;
    for (const char of pre ? raw : raw.replace(/\s+/g, ' ')) await this.#typeChar(char, pre);
  }

  async #typeChar(char: string, pre: boolean): Promise<void> {
    const space = SPACE.test(char);
    if (pre && char === '\n') {
      this.#write(char, false);
      return this.#carriageReturn();
    }
    // Satır başındaki ve ardışık boşluklar görünmez; tuşlanmadan eklenir.
    if (space && (this.#pendingReturn || SPACE.test(this.#prev))) {
      this.#write(char, false);
      return;
    }
    if (this.#pendingReturn) {
      this.#pendingReturn = false;
      await this.#carriageReturn();
    }
    if (LETTER.test(char) && Math.random() < this.#opts.typoRate) await this.#overstrike(char);

    this.#write(char, true);
    this.#typedAny = true;
    this.#sound.playKeyClick(space);
    const delay = this.#delay(char);
    this.#prev = char;
    if (this.#wrapped()) {
      await this.#carriageReturn();
      this.#prev = char;
    }
    await this.#sleep(delay);
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
    typo.textContent = neighborKey(char);
    this.#place(typo);
    this.#sound.playKeyClick(false);
    await this.#sleep(Math.max(150, this.#opts.speed * 2.5));
    typo.dataset.strike = this.#opts.overstrikeChar;
    this.#sound.playKeyClick(false);
    await this.#sleep(this.#opts.speed * 1.8);
  }

  #markReturn(): void {
    if (this.#typedAny) this.#pendingReturn = true;
  }

  async #carriageReturn(): Promise<void> {
    this.#sound.playCarriageDing();
    this.#prev = '\n';
    this.#lineTop = NaN;
    await this.#sleep(this.#opts.speed * 4);
  }

  /** İmleç bir alt satıra geçtiyse (metin sarıldıysa) true döner. */
  #wrapped(): boolean {
    const rect = this.#cursor.getBoundingClientRect();
    const top = rect.top + window.scrollY;
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
