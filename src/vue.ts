import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  shallowRef,
  watch,
  type Directive,
  type PropType,
  type VNode,
} from 'vue';
import { Daktilo, type DaktiloOptions, type PaperColors, type PaperPreset, type StampMetadata } from 'daktilo-js';

const instances = new WeakMap<HTMLElement, Daktilo>();

/**
 * `v-daktilo` directive: `<article v-daktilo="{ paper: 'vintage', animate: true }">`. Options are
 * read when the element mounts; the element is restored when it unmounts.
 */
export const vDaktilo: Directive<HTMLElement, DaktiloOptions | undefined> = {
  mounted(el, binding) {
    instances.set(el, new Daktilo(el, binding.value ?? {}));
  },
  beforeUnmount(el) {
    instances.get(el)?.destroy();
    instances.delete(el);
  },
};

// Vue, Boolean prop'ları yokken false yapar; undefined bırakıp çekirdeğin varsayılanını kullanıyoruz.
const flag = { type: Boolean, default: undefined };

/**
 * `<DaktiloSheet>`: renders its slot on typewriter paper. Props are the core options; listen to
 * `ready`, `char`, `line` and `complete`. Daktilo rearranges the DOM, so the slot is frozen until
 * `resetKey` changes; pass a new `resetKey` to retype dynamic content.
 */
export const DaktiloSheet = defineComponent({
  name: 'DaktiloSheet',
  props: {
    as: { type: String, default: 'article' },
    resetKey: { type: [String, Number], default: undefined },
    paper: [String, Object] as PropType<PaperPreset | PaperColors>,
    ribbonColor: String,
    maxWidth: String,
    inkWear: Number,
    animate: flag,
    speed: Number,
    typoRate: Number,
    overstrikeChar: String as PropType<'x' | '-'>,
    keyboard: Array as PropType<readonly string[]>,
    sound: { type: [Boolean, Object] as PropType<DaktiloOptions['sound']>, default: undefined },
    volume: Number,
    stamp: Object as PropType<StampMetadata>,
    fonts: { type: [Boolean, String], default: undefined },
    styles: flag,
    respectReducedMotion: flag,
    startOnVisible: flag,
    autoScroll: flag,
  },
  emits: {
    ready: (_daktilo: Daktilo) => true,
    char: (_char: string) => true,
    line: () => true,
    complete: () => true,
  },
  setup(props, { slots, emit, expose }) {
    const el = shallowRef<HTMLElement>();
    const daktilo = shallowRef<Daktilo | null>(null);
    let added: string[] = [];
    let frozen: VNode[] | undefined;
    let frozenKey: unknown;

    const start = (): void => {
      daktilo.value?.destroy();
      if (!el.value) return;
      const { as: _as, resetKey: _key, ...options } = props;
      const before = new Set(el.value.classList);
      daktilo.value = new Daktilo(el.value, {
        ...(options as DaktiloOptions),
        onChar: (char) => emit('char', char),
        onLine: () => emit('line'),
        onComplete: () => emit('complete'),
      });
      added = [...el.value.classList].filter((name) => !before.has(name));
      emit('ready', daktilo.value);
    };

    onMounted(start);
    // resetKey değişince kök eleman (key ile) baştan oluşturulur; DOM güncellendikten sonra yeniden başlatılır.
    watch(() => props.resetKey, start, { flush: 'post' });
    // Vue `class` değişince özniteliği baştan yazar; Daktilo'nun eklediği sınıflar geri konur.
    onUpdated(() => el.value?.classList.add(...added));
    onBeforeUnmount(() => daktilo.value?.destroy());
    expose({ daktilo });

    return () => {
      if (!frozen || frozenKey !== props.resetKey) {
        frozen = slots.default?.();
        frozenKey = props.resetKey;
      }
      return h(props.as, { ref: el, key: props.resetKey }, frozen);
    };
  },
});

export type { DaktiloOptions } from 'daktilo-js';
