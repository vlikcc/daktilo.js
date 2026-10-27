import { TURKISH_Q } from './keyboard';
import type { DaktiloOptions, PaperPreset, ResolvedOptions } from './types';

export const PAPERS: readonly PaperPreset[] = ['vintage', 'clean', 'carbon', 'auto'];

const DEFAULTS = {
  maxWidth: '65ch',
  animate: false,
  keyboard: TURKISH_Q,
  sound: false,
  stamp: null,
  fonts: true,
  styles: true,
  respectReducedMotion: true,
  startOnVisible: false,
  autoScroll: false,
};

const range = (value: unknown, fallback: number, min: number, max: number): number =>
  typeof value === 'number' && !Number.isNaN(value) ? Math.min(max, Math.max(min, value)) : fallback;

export function resolveOptions(options: DaktiloOptions = {}): ResolvedOptions {
  // `undefined` verilen seçenekler (ör. React prop'ları) varsayılanı ezmez.
  const o: DaktiloOptions = {
    ...DEFAULTS,
    ...Object.fromEntries(Object.entries(options).filter(([, v]) => v != null)),
  };
  return {
    ...(o as Required<DaktiloOptions>),
    paper: typeof o.paper === 'object' || PAPERS.includes(o.paper!) ? o.paper! : 'vintage',
    ribbonColor: o.ribbonColor || undefined,
    inkWear: range(o.inkWear, 0.35, 0, 1),
    speed: range(o.speed, 45, 0, 2000),
    typoRate: range(o.typoRate, 0.02, 0, 0.2),
    overstrikeChar: o.overstrikeChar === '-' ? '-' : 'x',
    volume: range(o.volume, 0.4, 0, 1),
  };
}
