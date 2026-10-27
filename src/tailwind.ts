import { CSS } from './styles';

export interface CssInJs {
  [selectorOrProperty: string]: string | CssInJs;
}

/** Converts CSS into the CSS-in-JS object Tailwind's `addComponents` expects (nested at-rules included). */
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
 * Like `cssToJs`, but nests top-level `@media` blocks inside their selectors: Tailwind v4 only
 * accepts class selectors (and @keyframes) at the top level of `addComponents`.
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

/** The part of Tailwind's plugin API the plugin uses. */
export interface PluginAPI {
  addComponents(components: CssInJs): void;
}

/**
 * Tailwind CSS plugin (v3 and v4). Adds the Daktilo classes (`daktilo-sheet`, `daktilo-theme-*`,
 * `daktilo-meta-header` …) to the components layer and theme values for utilities such as
 * `font-typewriter` and `text-daktilo-ribbon`: the paper look without JavaScript.
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
