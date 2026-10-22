import { MechanicalSoundEngine } from './audio';
import { canUseDOM, prefersReducedMotion, preserveAttributes, snapshot } from './dom';
import { applyInkWear } from './ink';
import { resolveOptions } from './options';
import { renderStamp } from './stamp';
import { injectStyles } from './styles';
import { Typist } from './typist';
import type { DaktiloOptions, DaktiloTarget, ResolvedOptions } from './types';

// Aynı eleman yeniden başlatıldığında (ör. React StrictMode) önceki örneğin izleri temizlenir.
const activeMounts = new WeakMap<HTMLElement, () => void>();

function resolveTargets(target: DaktiloTarget): HTMLElement[] {
  const list = typeof target === 'string' ? document.querySelectorAll(target) : target instanceof Element ? [target] : target;
  return Array.from(list ?? []).filter((el): el is HTMLElement => el instanceof HTMLElement);
}

export class Daktilo {
  readonly elements: HTMLElement[];
  readonly options: ResolvedOptions;
  /** Tüm yazım animasyonları bittiğinde (veya atlandığında / iptal edildiğinde) çözülür. */
  readonly finished: Promise<void>;
  #sound: MechanicalSoundEngine;
  #cleanups: Array<() => void> = [];
  #skips: Array<() => void> = [];

  constructor(target: DaktiloTarget, options: DaktiloOptions = {}) {
    this.options = resolveOptions(options);
    this.elements = canUseDOM() ? resolveTargets(target) : [];
    const reduced = this.options.respectReducedMotion && prefersReducedMotion();
    this.#sound = new MechanicalSoundEngine(
      this.options.sound && !reduced && this.elements.length > 0,
      this.options.volume,
    );
    if (this.elements.length) injectStyles(this.options.fonts);
    const animate = this.options.animate && !reduced;
    this.finished = Promise.all(this.elements.map((el) => this.#mount(el, animate))).then(() => undefined);
  }

  /** Devam eden yazım animasyonlarını anında tamamlar. */
  skip(): void {
    this.#skips.splice(0).forEach((skip) => skip());
  }

  /** Elemanları başlatma öncesi hâline (orijinal düğümler, sınıflar ve stiller) döndürür. */
  destroy(): void {
    this.#skips.length = 0;
    this.#cleanups.splice(0).forEach((cleanup) => cleanup());
    this.#sound.dispose();
  }

  #mount(el: HTMLElement, animate: boolean): Promise<void> {
    activeMounts.get(el)?.();
    const o = this.options;
    const restoreTree = snapshot(el);
    const restoreAttributes = preserveAttributes(el, ['class', 'style', 'aria-busy']);
    const stamp = o.stamp ? renderStamp(o.stamp) : null;
    let typist: Typist | null = null;
    let done = false;

    const cleanup = (): void => {
      if (done) return;
      done = true;
      typist?.cancel();
      restoreTree();
      restoreAttributes();
      if (activeMounts.get(el) === cleanup) activeMounts.delete(el);
    };
    activeMounts.set(el, cleanup);
    this.#cleanups.push(cleanup);

    el.classList.add('daktilo-sheet', `daktilo-theme-${o.paper}`);
    el.style.setProperty('--daktilo-width', o.maxWidth);
    if (o.ribbonColor) el.style.setProperty('--daktilo-ribbon', o.ribbonColor);

    const renderStatic = (): void => {
      if (stamp) el.prepend(stamp);
      applyInkWear(el, o.inkWear);
    };
    if (!animate) {
      renderStatic();
      return Promise.resolve();
    }

    const content = Array.from(el.childNodes);
    el.replaceChildren(...(stamp ? [stamp] : []));
    el.setAttribute('aria-busy', 'true');
    const activeTypist = (typist = new Typist(o, this.#sound));
    let typing = true;
    this.#skips.push(() => {
      if (done || !typing) return;
      typing = false;
      activeTypist.cancel();
      restoreTree();
      el.removeAttribute('aria-busy');
      renderStatic();
    });
    return activeTypist.type(el, content).then((completed) => {
      typing = false;
      if (completed) el.removeAttribute('aria-busy');
    });
  }
}
