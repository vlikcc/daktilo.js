import { MechanicalSoundEngine } from './audio';
import { canUseDOM, prefersReducedMotion, preserveAttributes } from './dom';
import { PAPERS } from './options';
import { injectStyles } from './styles';
import type { PaperPreset, SoundEngine } from './types';

export interface WriterOptions {
  /** Varsayılan: 'vintage' */
  paper?: PaperPreset;
  /** Şerit/vurgu (ve imleç) rengi. Varsayılan: kağıt temasının şerit rengi. */
  ribbonColor?: string;
  /** Varsayılan: '65ch' */
  maxWidth?: string;
  /** Çekirdekteki `fonts` ile aynı. Varsayılan: true */
  fonts?: boolean | string;
  /** Çekirdekteki `styles` ile aynı. Varsayılan: true */
  styles?: boolean;
  /** `true`: sentez sesler; bir `SoundEngine` verilirse o kullanılır. Varsayılan: true */
  sound?: boolean | SoundEngine;
  /** Sentez ses seviyesi (0.0 - 1.0). Varsayılan: 0.4 */
  volume?: number;
  /** Satırda bu sütuna ulaşınca kenar boşluğu çanı çalar (gerçek daktilodaki gibi). 0: kapalı. Varsayılan: 0 */
  bellColumn?: number;
  /** Silme, kesme ve geri almayı engeller: kağıda basılan geri alınamaz. Varsayılan: false */
  noErase?: boolean;
  /** prefers-reduced-motion: reduce aktifken sesi kapatır. Varsayılan: true */
  respectReducedMotion?: boolean;
}

const STYLE_ID = 'daktilo-writer-css';
const CSS = `.daktilo-writer{display:block;width:100%;min-height:12rem;border:0;outline:0;resize:vertical;font-size:inherit;caret-color:var(--daktilo-ribbon)}
.daktilo-writer:focus-visible{box-shadow:0 0 0 2px var(--daktilo-ribbon)}`;

const isField = (el: Element): el is HTMLTextAreaElement | HTMLInputElement =>
  el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement;

/**
 * Yazar modu: bir `<textarea>` veya `contenteditable` alanı daktilo kağıdına çevirir; yazarken
 * tuş, boşluk ve satır sonu sesleri çalar. Metin değiştirilmez, yalnızca görünüm ve ses eklenir.
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

  /** Ses seviyesini (0.0 - 1.0) değiştirir. */
  setVolume(volume: number): void {
    this.#sound.setVolume?.(volume);
  }

  /** Alanı başlatma öncesi hâline döndürür ve sesi kapatır; yazılan metne dokunmaz. */
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
