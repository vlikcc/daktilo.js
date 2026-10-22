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
   * Çekirdekteki `sound` ile aynı; ayrıca bir fabrika fonksiyonu alır. Motor her başlatmada
   * `destroy()` ile kapatıldığından (ör. StrictMode'un çift effect çalıştırması) fabrika önerilir:
   * `sound: () => new SampleSoundEngine({...})`
   */
  sound?: DaktiloOptions['sound'] | (() => SoundEngine);
}

// Sunucuda useLayoutEffect uyarı verir; tarayıcıda ise boyamadan önce çalışıp tam metnin bir an görünmesini önler.
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const CALLBACKS = ['onChar', 'onLine', 'onComplete'] as const;

/**
 * Döndürülen `ref`'i bir elemana bağlayın; eleman bağlandığında Daktilo başlatılır ve bileşen
 * kaldırıldığında `destroy()` ile eski hâline döner. Seçenekler yalnızca başlatmada okunur;
 * yeniden başlatmak için `deps` verin. Olay callback'leri her zaman son render'daki hâliyle çağrılır.
 */
export function useDaktilo<T extends HTMLElement = HTMLElement>(
  options: ReactDaktiloOptions = {},
  deps: DependencyList = [],
): { ref: RefObject<T | null>; daktilo: Daktilo | null } {
  const ref = useRef<T | null>(null);
  const latest = useRef(options);
  latest.current = options;
  const [daktilo, setDaktilo] = useState<Daktilo | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (!ref.current) return;
    const { sound, ...rest } = latest.current;
    const callbacks = Object.fromEntries(
      CALLBACKS.map((name) => [
        name,
        (...args: never[]) => (latest.current[name] as (...a: never[]) => void)?.(...args),
      ]),
    );
    const instance = new Daktilo(ref.current, {
      ...rest,
      ...callbacks,
      sound: typeof sound === 'function' ? sound() : sound,
    });
    setDaktilo(instance);
    return () => instance.destroy();
  }, deps);

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
  /** Kağıt olarak oluşturulacak etiket. Varsayılan: 'article' */
  as?: string;
  /** Değiştiğinde kağıt içeriğiyle birlikte baştan oluşturulur ve yeniden yazılır. */
  resetKey?: string | number;
  /** Daktilo örneği hazır olduğunda çağrılır (ör. `skip()`, `pause()`, `type()` için). */
  onReady?: (daktilo: Daktilo) => void;
  children?: ReactNode;
}

/**
 * İçeriğini daktilo kağıdına çeviren bileşen. Daktilo DOM'u yeniden düzenlediği için çocuklar
 * `resetKey` değişene kadar dondurulur; dinamik içerik için `resetKey` verin.
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
