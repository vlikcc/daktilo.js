import { MechanicalSoundEngine } from './audio';
import { canUseDOM, prefersReducedMotion, preserveAttributes, snapshot } from './dom';
import { applyInkWear } from './ink';
import { resolveOptions } from './options';
import { renderStamp } from './stamp';
import { fontsReady, injectStyles } from './styles';
import { Typist } from './typist';
import type { DaktiloOptions, DaktiloTarget, ResolvedOptions, SoundEngine } from './types';

// Aynı eleman yeniden başlatıldığında (ör. React StrictMode) önceki örneğin izleri temizlenir.
const activeMounts = new WeakMap<HTMLElement, () => void>();

function resolveTargets(target: DaktiloTarget): HTMLElement[] {
  const list =
    typeof target === 'string' ? document.querySelectorAll(target) : target instanceof Element ? [target] : target;
  const elements = Array.from(list ?? []).filter((el): el is HTMLElement => el instanceof HTMLElement);
  if (typeof target === 'string' && !elements.length) console.warn(`daktilo-js: "${target}" bulunamadı`);
  return elements;
}

const div = (className?: string): HTMLDivElement => {
  const el = document.createElement('div');
  if (className) el.className = className;
  return el;
};

export class Daktilo {
  readonly elements: HTMLElement[];
  readonly options: ResolvedOptions;
  /** İlk yazım animasyonları bittiğinde (veya atlandığında / iptal edildiğinde) çözülür. */
  readonly finished: Promise<void>;
  /** `true` iken tuş ve çan sesleri çalınmaz. */
  muted = false;
  #sound: SoundEngine;
  #voice: SoundEngine;
  #animate: boolean;
  #cleanups: Array<() => void> = [];
  #dead = new WeakSet<HTMLElement>();
  #typists = new Set<Typist>();
  #queues = new Map<HTMLElement, Promise<void>>();
  #paused = false;
  #jobs = 0;
  #skipUntil = 0;

  constructor(target: DaktiloTarget, options: DaktiloOptions = {}) {
    const o = (this.options = resolveOptions(options));
    this.elements = canUseDOM() ? resolveTargets(target) : [];
    const reduced = o.respectReducedMotion && prefersReducedMotion();
    const { sound } = o;
    const audible = !!sound && !reduced && this.elements.length > 0;
    if (typeof sound === 'object' && !audible) sound.dispose();
    const engine = (this.#sound =
      audible && typeof sound === 'object' ? sound : new MechanicalSoundEngine(audible, o.volume));
    this.#voice = {
      playKeyClick: (isSpace) => this.muted || engine.playKeyClick(isSpace),
      playCarriageDing: () => this.muted || engine.playCarriageDing(),
      dispose() {},
    };
    if (this.elements.length) injectStyles(o.fonts, o.styles);
    this.#animate = o.animate && !reduced;
    this.finished = Promise.all(this.elements.map((el) => this.#mount(el))).then(() => undefined);
    void this.finished.then(() => this.#cleanups.length && o.onComplete?.());
  }

  /** Devam eden ve sırada bekleyen yazımları anında tamamlar. */
  skip(): void {
    this.#skipUntil = this.#jobs;
    this.#typists.forEach((typist) => typist.finish());
  }

  /** Yazımı duraklatır; `resume()` ile kaldığı yerden sürer. */
  pause(): void {
    this.#paused = true;
    this.#typists.forEach((typist) => typist.pause());
  }

  resume(): void {
    this.#paused = false;
    this.#typists.forEach((typist) => typist.resume());
  }

  get paused(): boolean {
    return this.#paused;
  }

  /** Ses seviyesini (0.0 - 1.0) değiştirir. */
  setVolume(volume: number): void {
    this.#sound.setVolume?.(volume);
  }

  /**
   * Kağıda yeni içerik ekler ve (animate açıksa) önceki yazımlar bittikten sonra yazar.
   * Metin yeni bir paragraf olarak eklenir; özel yapı için bir düğüm verin.
   */
  type(content: string | Node): Promise<void> {
    return Promise.all(
      this.elements.map((el, i) => {
        let node = content;
        if (typeof node === 'string') {
          node = document.createElement('p');
          node.textContent = content as string;
        } else if (i) node = node.cloneNode(true);
        return this.#enqueue(el, [node]);
      }),
    ).then(() => undefined);
  }

  /** Elemanları başlatma öncesi hâline (orijinal düğümler, sınıflar ve stiller) döndürür. */
  destroy(): void {
    this.#cleanups.splice(0).forEach((cleanup) => cleanup());
    this.#sound.dispose();
  }

  async #mount(el: HTMLElement): Promise<void> {
    activeMounts.get(el)?.();
    const o = this.options;
    const restoreTree = snapshot(el);
    const restoreAttributes = preserveAttributes(el, ['class', 'style', 'aria-busy']);
    const stamp = o.stamp ? renderStamp(o.stamp) : null;
    let observer: IntersectionObserver | undefined;

    const cleanup = (): void => {
      if (this.#dead.has(el)) return;
      this.#dead.add(el);
      observer?.disconnect();
      this.#typists.forEach((typist) => typist.sheet === el && typist.cancel());
      restoreTree();
      restoreAttributes();
      if (activeMounts.get(el) === cleanup) activeMounts.delete(el);
    };
    activeMounts.set(el, cleanup);
    this.#cleanups.push(cleanup);

    el.classList.add('daktilo-sheet', `daktilo-theme-${o.paper}`);
    el.style.setProperty('--daktilo-width', o.maxWidth);
    if (o.ribbonColor) el.style.setProperty('--daktilo-ribbon', o.ribbonColor);

    if (!this.#animate) {
      if (stamp) el.prepend(stamp);
      return applyInkWear(el, o.inkWear);
    }
    // Yazım, fontlar yüklenince ve (startOnVisible ise) kağıt ekrana girince başlar.
    const seen =
      o.startOnVisible &&
      typeof IntersectionObserver === 'function' &&
      new Promise((resolve) => {
        observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && resolve(0));
        observer.observe(el);
      });
    // innerText blok sınırlarını korur; ekran okuyucu kopyası için içerik ayrılmadan okunur.
    const text = el.innerText ?? el.textContent;
    const content = Array.from(el.childNodes);
    el.replaceChildren(...(stamp ? [stamp] : []));
    await this.#enqueue(el, content, text, Promise.all([fontsReady(), seen]));
    observer?.disconnect();
  }

  async #enqueue(el: HTMLElement, nodes: Node[], text?: string, start?: Promise<unknown>): Promise<void> {
    if (this.#dead.has(el)) return;
    if (!this.#animate) {
      el.append(...nodes);
      return nodes.forEach((node) => applyInkWear(node, this.options.inkWear));
    }
    const id = ++this.#jobs;
    const run = (): Promise<void> => this.#type(el, nodes, text ?? nodes.map((n) => n.textContent).join(''), id, start);
    const previous = this.#queues.get(el);
    const job = previous ? previous.then(run) : run();
    this.#queues.set(el, job);
    await job;
  }

  /**
   * Düğümleri `aria-hidden` bir kutuda yazar; bu sırada ekran okuyucular metnin tamamını görsel olarak
   * gizli bir kopyadan okur. Yazım bitince kutu açılır ve düğümler doğrudan kağıda yerleşir.
   */
  async #type(el: HTMLElement, nodes: Node[], text: string, id: number, start?: Promise<unknown>): Promise<void> {
    if (this.#dead.has(el)) return;
    const sr = div('daktilo-sr');
    sr.textContent = text;
    const box = div();
    box.setAttribute('aria-hidden', 'true');
    el.append(sr, box);
    el.setAttribute('aria-busy', 'true');
    const typist = new Typist(this.options, this.#voice, el);
    this.#typists.add(typist);
    if (this.#paused) typist.pause();
    if (id <= this.#skipUntil) typist.finish();
    const completed = await typist.type(box, nodes, start);
    this.#typists.delete(typist);
    if (!completed) return;
    sr.remove();
    box.replaceWith(...box.childNodes);
    el.removeAttribute('aria-busy');
  }
}
