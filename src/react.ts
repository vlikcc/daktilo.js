import {
  createElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DependencyList,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { Daktilo, type DaktiloOptions, type SoundEngine } from 'daktilo-js';

export interface ReactDaktiloOptions extends Omit<DaktiloOptions, 'sound'> {
  /**
   * Same as the core `sound` option, and also accepts a factory. Each mount disposes its engine on
   * `destroy()` (StrictMode mounts twice), so prefer a factory:
   * `sound: () => new SampleSoundEngine({...})`
   */
  sound?: DaktiloOptions['sound'] | (() => SoundEngine);
}

// Sunucuda useLayoutEffect uyarı verir; tarayıcıda ise boyamadan önce çalışıp tam metnin bir an görünmesini önler.
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const CALLBACKS = ['onChar', 'onLine', 'onComplete'] as const;

/**
 * Attach the returned `ref` to an element: Daktilo starts when it mounts and `destroy()` restores it
 * on unmount. Options are read once at mount; pass `deps` to restart. Event callbacks always use the
 * latest render.
 */
export function useDaktilo<T extends HTMLElement = HTMLElement>(
  options: ReactDaktiloOptions = {},
  deps: DependencyList = [],
): { ref: RefObject<T | null>; daktilo: Daktilo | null } {
  const ref = useRef<T | null>(null);
  const latest = useRef(options);
  latest.current = options;
  const [daktilo, setDaktilo] = useState<Daktilo | null>(null);
  const added = useRef<string[]>([]);

  useIsomorphicLayoutEffect(() => {
    if (!ref.current) return;
    const { sound, ...rest } = latest.current;
    const callbacks = Object.fromEntries(
      CALLBACKS.map((name) => [
        name,
        (...args: never[]) => (latest.current[name] as (...a: never[]) => void)?.(...args),
      ]),
    );
    const el = ref.current;
    const before = new Set(el.classList);
    const instance = new Daktilo(el, {
      ...rest,
      ...callbacks,
      sound: typeof sound === 'function' ? sound() : sound,
    });
    added.current = [...el.classList].filter((name) => !before.has(name));
    setDaktilo(instance);
    return () => {
      added.current = [];
      instance.destroy();
    };
  }, deps);

  // React `className` değişince class özniteliğini baştan yazar; Daktilo'nun eklediği sınıflar geri konur.
  useIsomorphicLayoutEffect(() => {
    ref.current?.classList.add(...added.current);
  });

  return { ref, daktilo };
}

const OPTION_KEYS = new Set<string>([
  'paper',
  'ribbonColor',
  'maxWidth',
  'inkWear',
  'animate',
  'speed',
  'typoRate',
  'overstrikeChar',
  'keyboard',
  'sound',
  'volume',
  'stamp',
  'fonts',
  'styles',
  'respectReducedMotion',
  'startOnVisible',
  'autoScroll',
  ...CALLBACKS,
]);

export interface DaktiloSheetProps
  extends ReactDaktiloOptions, Omit<HTMLAttributes<HTMLElement>, keyof ReactDaktiloOptions | 'children'> {
  /** Tag rendered as the paper. Default: 'article' */
  as?: string;
  /** When it changes, the paper is recreated with the current children and typed again. */
  resetKey?: string | number;
  /** Called with the Daktilo instance once it is ready (for `skip()`, `pause()`, `type()` …). */
  onReady?: (daktilo: Daktilo) => void;
  children?: ReactNode;
}

/**
 * Renders its children on typewriter paper. Daktilo rearranges the DOM, so children are frozen
 * until `resetKey` changes; pass a new `resetKey` for dynamic content.
 */
export function DaktiloSheet({
  as = 'article',
  resetKey,
  onReady,
  children,
  ...rest
}: DaktiloSheetProps): ReactElement {
  const options: Record<string, unknown> = {};
  const props: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) (OPTION_KEYS.has(key) ? options : props)[key] = value;

  const { ref, daktilo } = useDaktilo(options as ReactDaktiloOptions, [resetKey]);
  const ready = useRef(onReady);
  ready.current = onReady;
  useEffect(() => {
    if (daktilo) ready.current?.(daktilo);
  }, [daktilo]);

  const frozen = useMemo(() => children, [resetKey]);
  return createElement(as, { ...props, ref, key: String(resetKey) }, frozen);
}

export type { DaktiloOptions } from 'daktilo-js';
