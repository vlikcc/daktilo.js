import { CSS } from './styles';

export interface CssInJs {
  [selectorOrProperty: string]: string | CssInJs;
}

/** Tailwind'in `addComponents` beklediği CSS-in-JS nesnesine çevirir (iç içe @media/@keyframes dahil). */
export function cssToJs(css: string): CssInJs {
  const root: CssInJs = {};
  const stack = [root];
  let buffer = '';
  const declare = (): void => {
    const colon = buffer.indexOf(':');
    if (colon > 0) stack[stack.length - 1][buffer.slice(0, colon).trim()] = buffer.slice(colon + 1).trim();
    buffer = '';
  };
  for (const char of css) {
    if (char === '{') {
      const parent = stack[stack.length - 1];
      const selector = buffer.trim();
      const block = (parent[selector] ??= {}) as CssInJs;
      stack.push(block);
      buffer = '';
    } else if (char === '}') {
      declare();
      if (stack.length > 1) stack.pop();
    } else if (char === ';') {
      declare();
    } else {
      buffer += char;
    }
  }
  return root;
}

/**
 * `cssToJs` çıktısındaki üst düzey `@media` bloklarını seçicilerin içine taşır: Tailwind v4,
 * `addComponents` içinde yalnızca sınıf seçicilerini (ve @keyframes'i) üst düzeyde kabul eder.
 */
export function toComponents(css: string): CssInJs {
  const components = cssToJs(css);
  for (const [key, block] of Object.entries(components)) {
    if (!key.startsWith('@media') || typeof block === 'string') continue;
    delete components[key];
    for (const [selector, rules] of Object.entries(block)) {
      ((components[selector] ??= {}) as CssInJs)[key] = rules;
    }
  }
  return components;
}

interface PluginAPI {
  addComponents(components: CssInJs): void;
}

/**
 * Tailwind CSS eklentisi (v3 ve v4). Daktilo sınıflarını (`daktilo-sheet`, `daktilo-theme-*`,
 * `daktilo-meta-header` …) bileşen katmanına ekler; `font-typewriter` ve `text-daktilo-ribbon`
 * gibi yardımcı sınıflar için tema değerleri tanımlar. JavaScript olmadan kağıt görünümü sağlar.
 */
const daktilo = {
  handler({ addComponents }: PluginAPI): void {
    addComponents(toComponents(CSS));
  },
  config: {
    theme: {
      extend: {
        fontFamily: {
          typewriter: ["'Courier Prime'", 'Courier', 'monospace'],
          'typewriter-title': ["'Special Elite'", "'Courier Prime'", 'monospace'],
        },
        colors: {
          daktilo: {
            paper: 'var(--daktilo-paper)',
            ink: 'var(--daktilo-ink)',
            ribbon: 'var(--daktilo-ribbon)',
            rule: 'var(--daktilo-rule)',
          },
        },
      },
    },
  },
};

export default daktilo;
