/** Built-in paper themes. `auto` follows the system: `vintage` in light mode, `carbon` in dark mode. */
export type PaperPreset = 'vintage' | 'clean' | 'carbon' | 'auto';

/** Custom paper colours (any CSS colour). Unset values fall back to the `vintage` theme. */
export interface PaperColors {
  paper?: string;
  ink?: string;
  ribbon?: string;
  /** Heading and header rule colour. */
  rule?: string;
  /** Colour of the paper's pore texture dots. */
  pore?: string;
}

export interface StampLabels {
  /** Default: 'KAYIT' */
  docNo?: string;
  /** Default: 'TARİH' */
  date?: string;
  /** Default: 'YAZAN' */
  author?: string;
}

export interface StampMetadata {
  docNo?: string;
  date?: string;
  author?: string;
  /** Rotated stamp text, e.g. "DRAFT", "ARCHIVE", "CONFIDENTIAL". */
  classification?: string;
  /** Field labels, e.g. `{ docNo: 'REF', date: 'DATE', author: 'BY' }`. Default: Turkish labels */
  labels?: StampLabels;
  /** Locale used to format today's date when `date` is not given. Default: 'tr-TR' */
  locale?: string;
}

/** Sounds played by the typing engine. The instance owns it: `destroy()` disposes it too. */
export interface SoundEngine {
  playKeyClick(isSpace?: boolean): void;
  /** The margin bell, rung once per line a few characters before the right margin. */
  playCarriageDing(): void;
  /** The carriage return at the start of every new line. Optional for custom engines. */
  playCarriageReturn?(): void;
  dispose(): void;
  setVolume?(volume: number): void;
}

export interface DaktiloOptions {
  /** A theme name or custom colours. Default: 'vintage' */
  paper?: PaperPreset | PaperColors;
  /** Ribbon/accent colour. Default: the paper theme's ribbon colour ('#c84b31' for vintage). */
  ribbonColor?: string;
  /** Paper width. Default: '65ch' */
  maxWidth?: string;
  /** Ink wear from 0 (off) to 1 (heavy). Default: 0.35 */
  inkWear?: number;
  /** Letter-by-letter typing animation. Default: false */
  animate?: boolean;
  /** Average delay per letter in ms. Default: 45 */
  speed?: number;
  /** Overstrike mistake rate (0 - 0.2). Never applied inside code, kbd, samp or pre. Default: 0.02 */
  typoRate?: number;
  /** Character struck over a mistake. Default: 'x' */
  overstrikeChar?: 'x' | '-';
  /**
   * Lowercase letter rows used to pick the neighbouring "wrong" key. Presets live in
   * `daktilo-js/keyboards`. Default: Turkish Q
   */
  keyboard?: readonly string[];
  /**
   * `true`: file-free mechanical sounds synthesized with Web Audio.
   * Pass a `SoundEngine` (e.g. `SampleSoundEngine` from `daktilo-js/samples`) to use it instead.
   * Default: false
   */
  sound?: boolean | SoundEngine;
  /** Synth volume (0.0 - 1.0). Default: 0.4 */
  volume?: number;
  /** Document header with record number, date, author and a rotated stamp. Default: null */
  stamp?: StampMetadata | null;
  /**
   * `true`: loads Special Elite and Courier Prime from Google Fonts.
   * A URL loads them from that stylesheet instead (e.g. self-hosted). Default: true
   */
  fonts?: boolean | string;
  /**
   * Injects the core CSS in a `<style>` tag. With a strict CSP, pass `false` and load
   * `daktilo-js/style.css` yourself. Default: true
   */
  styles?: boolean;
  /** Disables animation and sound when `prefers-reduced-motion: reduce` is set. Default: true */
  respectReducedMotion?: boolean;
  /** Start typing when the paper scrolls into view (IntersectionObserver). Default: false */
  startOnVisible?: boolean;
  /** Keep the cursor in view while typing. Default: false */
  autoScroll?: boolean;
  /** Called on every keystroke (not for skipped text). */
  onChar?: (char: string, element: HTMLElement) => void;
  /** Called at every new line, together with the carriage sound. */
  onLine?: (element: HTMLElement) => void;
  /** Called once the initial typing finishes or is skipped; not called after `destroy()`. */
  onComplete?: () => void;
}

type Callbacks = 'onChar' | 'onLine' | 'onComplete';

export interface ResolvedOptions
  extends Required<Omit<DaktiloOptions, 'ribbonColor' | Callbacks>>, Pick<DaktiloOptions, Callbacks> {
  ribbonColor: string | undefined;
}

export type DaktiloTarget = string | Element | ArrayLike<Element>;
