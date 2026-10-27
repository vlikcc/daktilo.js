import { Daktilo, type DaktiloOptions } from 'daktilo-js';

/** The object a Svelte action returns. */
export interface DaktiloAction {
  update(options?: DaktiloOptions): void;
  destroy(): void;
}

/**
 * Svelte action (Svelte 3, 4 and 5): `<article use:daktilo={{ paper: 'vintage', animate: true }}>`.
 * Changing the options restarts the paper; the element is restored when it is removed. Keep the
 * content static while it is on paper, since Daktilo rearranges the DOM.
 *
 * Pass `onReady` to get the instance for `skip()`, `pause()` or `type()`.
 */
export function daktilo(
  node: HTMLElement,
  options: DaktiloOptions & { onReady?: (instance: Daktilo) => void } = {},
): DaktiloAction {
  let instance: Daktilo;
  const start = (next: typeof options = {}): void => {
    instance = new Daktilo(node, next);
    next.onReady?.(instance);
  };
  start(options);
  return {
    update(next) {
      instance.destroy();
      start(next);
    },
    destroy() {
      instance.destroy();
    },
  };
}

export type { DaktiloOptions } from 'daktilo-js';
