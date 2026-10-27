import { MechanicalSoundEngine } from './audio';
import { canUseDOM, prefersReducedMotion, preserveAttributes } from './dom';
import { PAPERS } from './options';
import { injectStyles } from './styles';
import type { PaperPreset, SoundEngine } from './types';

export interface WriterOptions {
  /** Default: 'vintage' */
  paper?: PaperPreset;
  /** Ribbon/accent (and caret) colour. Default: the paper theme's ribbon colour. */
  ribbonColor?: string;
  /** Paper width. Default: '65ch' */
  maxWidth?: string;
  /** Same as the core `fonts` option. Default: true */
  fonts?: boolean | string;
  /** Same as the core `styles` option. Default: true */
  styles?: boolean;
  /** `true`: synthesized sounds; pass a `SoundEngine` to use it instead. Default: true */
  sound?: boolean | SoundEngine;
  /** Synth volume (0.0 - 1.0). Default: 0.4 */
  volume?: number;
  /** Rings the margin bell when the line reaches this column, like a real typewriter. 0: off. Default: 0 */
  bellColumn?: number;
  /** Blocks delete, cut and undo: what is on paper stays on paper. Default: false */
  noErase?: boolean;
  /** Disables sound when `prefers-reduced-motion: reduce` is set. Default: true */
  respectReducedMotion?: boolean;
}

const STYLE_ID = 'daktilo-writer-css';
const CSS = `.daktilo-writer{display:block;width:100%;min-height:12rem;border:0;outline:0;resize:vertical;font-size:inherit;caret-color:var(--daktilo-ribbon)}
.daktilo-writer:focus-visible{box-shadow:0 0 0 2px var(--daktilo-ribbon)}`;

const isField = (el: Element): el is HTMLTextAreaElement | HTMLInputElement =>
  el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement;

/**
 * Writer mode: turns a `<textarea>` or `contenteditable` element into typewriter paper that clicks,
 * thuds and rings as you type. The text itself is never changed; only looks and sound are added.
 */
export class DaktiloWriter {
  readonly element: HTMLElement | null;
  #sound: SoundEngine;
  #bellColumn: number;
  #noErase: boolean;
  #restore: () => void = () => undefined;

  constructor(target: string | HTMLElement, options: WriterOptions = {}) {
    const el = canUseDOM() ? (typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target) : null;
    this.element = el;
    this.#bellColumn = Math.max(0, options.bellColumn ?? 0);
    this.#noErase = options.noErase ?? false;
    const { sound = true } = options;
    const audible = !!el && !!sound && !((options.respectReducedMotion ?? true) && prefersReducedMotion());
    if (typeof sound === 'object' && !audible) sound.dispose();
    this.#sound = audible && typeof sound === 'object' ? sound : new MechanicalSoundEngine(audible, options.volume);
    if (!el) return;

    injectStyles(options.fonts ?? true, options.styles ?? true);
    if ((options.styles ?? true) && !document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = CSS;
      document.head.append(style);
    }
    const restoreAttributes = preserveAttributes(el, ['class', 'style', 'contenteditable', 'spellcheck']);
    const paper = options.paper && PAPERS.includes(options.paper) ? options.paper : 'vintage';
    el.classList.add('daktilo-sheet', `daktilo-theme-${paper}`, 'daktilo-writer');
    el.style.setProperty('--daktilo-width', options.maxWidth || '65ch');
    if (options.ribbonColor) el.style.setProperty('--daktilo-ribbon', options.ribbonColor);
    if (!isField(el) && !el.isContentEditable) el.setAttribute('contenteditable', 'true');
    el.setAttribute('spellcheck', 'false');
    el.addEventListener('beforeinput', this.#onInput);
    this.#restore = () => {
      el.removeEventListener('beforeinput', this.#onInput);
      restoreAttributes();
    };
  }

  /** Changes the volume (0.0 - 1.0). */
  setVolume(volume: number): void {
    this.#sound.setVolume?.(volume);
  }

  /** Restores the element and disposes the sound engine; the written text is kept. */
  destroy(): void {
    this.#restore();
    this.#restore = () => undefined;
    this.#sound.dispose();
  }

  #onInput = (event: Event): void => {
    const { inputType, data } = event as InputEvent;
    if (inputType.startsWith('delete') || inputType === 'historyUndo') {
      if (this.#noErase) event.preventDefault();
      else this.#sound.playKeyClick(false);
    } else if (inputType === 'insertLineBreak' || inputType === 'insertParagraph') {
      this.#sound.playCarriageDing();
    } else if (inputType === 'insertText' && data) {
      this.#sound.playKeyClick(/\s/.test(data));
      if (this.#bellColumn && this.#column() + data.length === this.#bellColumn) this.#sound.playCarriageDing();
    }
  };

  /** İmlecin bulunduğu satırdaki sütun (yazılacak karakterden önce). */
  #column(): number {
    const el = this.element!;
    let text: string;
    if (isField(el)) {
      text = el.value.slice(0, el.selectionStart ?? el.value.length);
    } else {
      const selection = getSelection();
      const node = selection?.focusNode;
      text = node?.nodeType === Node.TEXT_NODE ? node.nodeValue!.slice(0, selection!.focusOffset) : '';
    }
    return text.length - text.lastIndexOf('\n') - 1;
  }
}

export type { PaperPreset, SoundEngine } from './types';
