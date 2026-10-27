import { Daktilo, type DaktiloOptions, type StampMetadata } from 'daktilo-js';
import { AZERTY, QWERTY, QWERTY_ES, QWERTZ, TURKISH_F, TURKISH_Q } from './keyboards';
import { applyTextures, type Texture } from './textures';

/** Keyboard presets accepted by the `keyboard` attribute (case-insensitive). */
export const KEYBOARD_PRESETS: Record<string, readonly string[]> = {
  'turkish-q': TURKISH_Q,
  'turkish-f': TURKISH_F,
  qwerty: QWERTY,
  qwertz: QWERTZ,
  azerty: AZERTY,
  'qwerty-es': QWERTY_ES,
};

const STRINGS = ['paper', 'ribbon-color', 'max-width', 'overstrike-char'] as const;
const NUMBERS = ['ink-wear', 'speed', 'typo-rate', 'volume'] as const;
const FLAGS = ['animate', 'sound', 'start-on-visible', 'auto-scroll', 'respect-reduced-motion', 'styles'] as const;
const STAMP = ['doc-no', 'date', 'author', 'classification', 'locale', 'labels'] as const;

/** Attributes that restart the paper when they change. */
export const OBSERVED_ATTRIBUTES = [
  ...STRINGS,
  ...NUMBERS,
  ...FLAGS,
  'keyboard',
  'fonts',
  'stamp',
  'texture',
  ...STAMP.map((name) => `stamp-${name}`),
];

const camel = (name: string): string => name.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());

/**
 * Reads `DaktiloOptions` from an element's attributes. Flags are on when present unless their
 * value is `"false"`; `fonts` is `true` when absent, `false` for `"false"`, otherwise a stylesheet URL.
 */
export function optionsFromAttributes(el: Element): DaktiloOptions {
  const options: Record<string, unknown> = {};
  const attr = (name: string): string | null => el.getAttribute(name);
  for (const name of STRINGS) if (attr(name) !== null) options[camel(name)] = attr(name);
  for (const name of NUMBERS) {
    const value = attr(name);
    if (value !== null && value.trim() !== '' && !Number.isNaN(Number(value))) options[camel(name)] = Number(value);
  }
  for (const name of FLAGS) if (attr(name) !== null) options[camel(name)] = attr(name) !== 'false';

  const keyboard = attr('keyboard');
  if (keyboard) options.keyboard = KEYBOARD_PRESETS[keyboard.toLowerCase()];
  const fonts = attr('fonts');
  if (fonts !== null) options.fonts = fonts === 'false' ? false : fonts === '' || fonts === 'true' ? true : fonts;

  const stamp: StampMetadata = {};
  let hasStamp = false;
  for (const name of STAMP) {
    const value = attr(`stamp-${name}`);
    if (value === null) continue;
    hasStamp = true;
    if (name === 'labels') {
      // "REF,DATE,BY" → kayıt no, tarih ve yazan etiketleri
      const [docNo, date, author] = value.split(',').map((label) => label.trim());
      stamp.labels = { docNo, date, author };
    } else {
      stamp[camel(name) as Exclude<keyof StampMetadata, 'labels'>] = value;
    }
  }
  if (hasStamp || attr('stamp') !== null) options.stamp = stamp;
  return options;
}

// Sunucuda (SSR) HTMLElement yoktur; modül yine de içe aktarılabilir.
const Base = (typeof HTMLElement === 'undefined' ? class {} : HTMLElement) as typeof HTMLElement;

/**
 * `<daktilo-sheet>`: renders its children on typewriter paper, configured with attributes
 * (`paper`, `animate`, `ink-wear`, `typo-rate`, `keyboard`, `stamp-doc-no`, `texture` …). Emits `daktilo-char`,
 * `daktilo-line` and `daktilo-complete` events. Changing an attribute restarts the paper; removing the
 * element from the page restores its content.
 */
export class DaktiloSheetElement extends Base {
  static get observedAttributes(): string[] {
    return OBSERVED_ATTRIBUTES;
  }

  #daktilo: Daktilo | null = null;

  /** The underlying Daktilo instance, or `null` before the element is connected. */
  get daktilo(): Daktilo | null {
    return this.#daktilo;
  }

  /** Resolves when the current typing finishes (immediately when not started). */
  get finished(): Promise<void> {
    return this.#daktilo?.finished ?? Promise.resolve();
  }

  connectedCallback(): void {
    // Betik <head> içindeyse eleman bağlandığında çocukları henüz ayrıştırılmamış olabilir.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.#start(), { once: true });
    } else {
      this.#start();
    }
  }

  disconnectedCallback(): void {
    this.#daktilo?.destroy();
    this.#daktilo = null;
  }

  attributeChangedCallback(_name: string, previous: string | null, value: string | null): void {
    if (previous !== value && this.#daktilo) this.#start();
  }

  /** See `Daktilo#skip`. */
  skip(): void {
    this.#daktilo?.skip();
  }

  /** See `Daktilo#pause`. */
  pause(): void {
    this.#daktilo?.pause();
  }

  /** See `Daktilo#resume`. */
  resume(): void {
    this.#daktilo?.resume();
  }

  /** See `Daktilo#type`. */
  type(content: string | Node): Promise<void> {
    return this.#daktilo?.type(content) ?? Promise.resolve();
  }

  #start(): void {
    if (!this.isConnected) return;
    this.#daktilo?.destroy();
    const emit = (type: string, detail?: unknown): boolean =>
      this.dispatchEvent(new CustomEvent(type, { bubbles: true, detail }));
    const options = optionsFromAttributes(this);
    if (options.styles !== false) injectElementStyle(this.localName);
    this.#daktilo = new Daktilo(this, {
      ...options,
      onChar: (char) => emit('daktilo-char', { char }),
      onLine: () => emit('daktilo-line'),
      onComplete: () => emit('daktilo-complete'),
    });
    // destroy() sınıfları geri yüklediği için dokular her başlatmada yeniden eklenir.
    const textures = this.getAttribute('texture')?.split(/\s+/).filter(Boolean);
    if (textures?.length) applyTextures(this, textures as Texture[]);
  }
}

const injected = new Set<string>();

// Özel elemanlar varsayılan olarak satır içidir; kağıt blok olmalı. Kullanıcı CSS'i bunu ezebilir.
function injectElementStyle(tag: string): void {
  if (injected.has(tag)) return;
  injected.add(tag);
  const style = document.createElement('style');
  style.textContent = `${tag}{display:block}`;
  document.head.append(style);
}

/**
 * Registers the element (default name `daktilo-sheet`). Importing `daktilo-js/element` already
 * registers it; call this to use another tag name.
 */
export function defineDaktiloElement(name = 'daktilo-sheet'): void {
  if (typeof customElements === 'undefined' || customElements.get(name)) return;
  customElements.define(name, class extends DaktiloSheetElement {});
}

defineDaktiloElement();

declare global {
  interface HTMLElementTagNameMap {
    'daktilo-sheet': DaktiloSheetElement;
  }
}
