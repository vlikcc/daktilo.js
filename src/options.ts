import type { DaktiloOptions, PaperPreset, ResolvedOptions } from './types';

export const PAPERS: readonly PaperPreset[] = ['vintage', 'clean', 'carbon'];

const range = (value: unknown, fallback: number, min: number, max: number): number =>
  typeof value === 'number' && !Number.isNaN(value) ? Math.min(max, Math.max(min, value)) : fallback;

export function resolveOptions(o: DaktiloOptions = {}): ResolvedOptions {
  return {
    paper: o.paper && PAPERS.includes(o.paper) ? o.paper : 'vintage',
    ribbonColor: o.ribbonColor || undefined,
    maxWidth: o.maxWidth || '65ch',
    inkWear: range(o.inkWear, 0.35, 0, 1),
    animate: o.animate ?? false,
    speed: range(o.speed, 45, 0, 2000),
    typoRate: range(o.typoRate, 0.02, 0, 0.2),
    overstrikeChar: o.overstrikeChar === '-' ? '-' : 'x',
    sound: o.sound ?? false,
    volume: range(o.volume, 0.4, 0, 1),
    stamp: o.stamp ?? null,
    fonts: o.fonts ?? true,
    respectReducedMotion: o.respectReducedMotion ?? true,
  };
}
