# daktilo-js

[![CI](https://github.com/vlikcc/daktilo.js/actions/workflows/ci.yml/badge.svg)](https://github.com/vlikcc/daktilo.js/actions/workflows/ci.yml)

**English** · [Türkçe](README.tr.md) · [Playground](https://vlikcc.github.io/daktilo.js/) · [API reference](https://vlikcc.github.io/daktilo.js/api/)

A **zero-dependency** micro-library that turns any HTML container into a realistic sheet of typewriter paper with a single options object.

![daktilo-js typing a page with a stamp, ink wear and overstruck mistakes](https://raw.githubusercontent.com/vlikcc/daktilo.js/main/docs/demo.gif)

- **Paper themes:** `vintage` (straw paper), `clean` (modern white), `carbon` (dark carbon), `auto` (follows the system's dark mode) or your own colours
- **Organic ink:** per-letter vertical jitter, ribbon wear and ink bleed; `<mark>` prints with the red half of the ribbon
- **Overstrike typing engine:** mistakes are never erased — an `x` is struck over them; human rhythm that pauses on punctuation
- **File-free sound:** keys, space bar, the margin bell and the carriage return are synthesized live with the Web Audio API; optionally use a [real typewriter recording](#real-typewriter-recordings)
- **Playback control:** `pause()`, `resume()`, `skip()`, `type()` to append text, events, mute and volume
- **Accessible:** screen readers get the full text while typing; respects `prefers-reduced-motion`; prints cleanly
- **< 6 KB** (ESM, minified + gzip), TypeScript types included, SSR-safe
- **Everywhere:** a `<daktilo-sheet>` Web Component for any CMS, React, Vue, Svelte, Astro, a Tailwind CSS plugin, Writer mode for `<textarea>` / `contenteditable`, paper textures and keyboard layouts

## Install

```bash
npm i daktilo-js
```

### Web Component (WordPress, Ghost, Hugo, plain HTML)

One script tag, no build step. Configure the paper with attributes:

```html
<script src="https://unpkg.com/daktilo-js@1/dist/element.global.js"></script>

<daktilo-sheet
  paper="vintage"
  animate
  typo-rate="0.03"
  keyboard="qwerty"
  stamp-doc-no="#84-A"
  stamp-classification="ARCHIVE"
  stamp-labels="REF, DATE, BY"
  texture="stain"
>
  <h1>Night Notes</h1>
  <p>The mark of mechanical keys on paper breaks the coldness of the digital screen…</p>
</daktilo-sheet>
```

Every option except the callbacks has an attribute in kebab-case (`ink-wear`, `max-width`, `start-on-visible` …). Flags such as `animate` are on when present, unless set to `"false"`. Further attributes:

- `keyboard`: takes a preset name (`qwerty`, `qwertz`, `azerty`, `qwerty-es`, `turkish-q`, `turkish-f`).
- `stamp-*`: the stamp fields (`stamp-doc-no`, `stamp-date`, `stamp-author`, `stamp-classification`, `stamp-locale`, plus `stamp-labels="REF, DATE, BY"`).
- `texture`: adds [paper textures](#paper-textures).

The element:

- **Events:** fires `daktilo-char`, `daktilo-line` and `daktilo-complete`.
- **Methods:** exposes `skip()`, `pause()`, `resume()` and `type()`.
- **Lifecycle:** restarts when an attribute changes and restores its content when removed.

In a WordPress theme or a Ghost/Hugo template, add the script tag to the layout and wrap the post body in `<daktilo-sheet>`. With a bundler: `import 'daktilo-js/element'`.

### CDN (JavaScript API)

```html
<article id="my-essay">…</article>

<script src="https://unpkg.com/daktilo-js@1/dist/index.global.js"></script>
<script>
  new Daktilo.Daktilo('#my-essay', {
    paper: 'vintage',
    inkWear: 0.4,
    sound: true,
    stamp: { docNo: '#84-A', classification: 'ARCHIVE', labels: { docNo: 'REF', date: 'DATE', author: 'BY' } },
  });
</script>
```

### ESM / TypeScript

```ts
import { Daktilo } from 'daktilo-js';
import { QWERTY } from 'daktilo-js/keyboards';

const daktilo = new Daktilo('#my-essay', { animate: true, typoRate: 0.04, keyboard: QWERTY });
await daktilo.finished;
await daktilo.type('A new paragraph, typed after the first one.');
```

## Options

| Option                 | Default      | Description                                                                                            |
| ---------------------- | ------------ | ------------------------------------------------------------------------------------------------------ |
| `paper`                | `'vintage'`  | `'vintage' \| 'clean' \| 'carbon' \| 'auto'`, or custom colours `{ paper, ink, ribbon, rule, pore }`   |
| `ribbonColor`          | theme colour | Ribbon/accent colour (links, `<mark>`, stamp, overstrike, cursor)                                      |
| `maxWidth`             | `'65ch'`     | Paper width                                                                                            |
| `inkWear`              | `0.35`       | Ink wear, `0`–`1`                                                                                      |
| `animate`              | `false`      | Letter-by-letter typing animation                                                                      |
| `speed`                | `45`         | Average delay per letter (ms)                                                                          |
| `typoRate`             | `0.02`       | Overstrike mistake rate, `0`–`0.2` (never inside `code`, `kbd`, `samp`, `pre`)                         |
| `overstrikeChar`       | `'x'`        | `'x' \| '-'`                                                                                           |
| `keyboard`             | Turkish Q    | Letter rows used to pick the "wrong" neighbouring key. Presets in [`daktilo-js/keyboards`](#keyboards) |
| `sound`                | `false`      | `true`: synthesized sound; pass a `SoundEngine` to use it instead                                      |
| `volume`               | `0.4`        | Synth volume, `0`–`1`                                                                                  |
| `stamp`                | `null`       | `{ docNo, date, author, classification, labels, locale }` document header                              |
| `fonts`                | `true`       | `true`: loads Special Elite & Courier Prime from Google Fonts; a URL loads them from your own server   |
| `styles`               | `true`       | Inject the core CSS in a `<style>` tag. Use `false` + `daktilo-js/style.css` for strict CSP            |
| `respectReducedMotion` | `true`       | Disables animation and sound when `prefers-reduced-motion: reduce` is set                              |
| `startOnVisible`       | `false`      | Start typing when the paper scrolls into view (IntersectionObserver)                                   |
| `autoScroll`           | `false`      | Keep the cursor in view while typing                                                                   |
| `onChar(char, el)`     | –            | Called on every keystroke (not for skipped text)                                                       |
| `onLine(el)`           | –            | Called at each new line, together with the carriage return                                             |
| `onComplete()`         | –            | Called once the initial typing finishes or is skipped (not after `destroy()`)                          |

`stamp.labels` defaults to Turkish (`KAYIT`, `TARİH`, `YAZAN`) and `stamp.locale` to `'tr-TR'`; set them for other languages.

**Themes:** `paper: 'auto'` uses `vintage` in light mode and `carbon` in dark mode, and switches live. Custom colours override a theme's CSS variables; unset ones fall back to `vintage`:

```ts
new Daktilo('#essay', { paper: { paper: '#fffbe6', ink: '#1b263b', ribbon: '#9d0208' } });
```

The same variables (`--daktilo-paper`, `--daktilo-ink`, `--daktilo-ribbon`, `--daktilo-rule`, `--daktilo-pore`) can be set in your own CSS, e.g. `<daktilo-sheet style="--daktilo-paper: #fffbe6">`.

**Red ribbon:** `<mark>` and elements with the `daktilo-red` class print in the ribbon colour, like the red half of a two-colour ribbon.

## API

- `instance.finished: Promise<void>` resolves when the initial typing finishes (or is skipped / destroyed).
- `instance.skip()` instantly completes the current and queued typing. Already-typed letters keep their ink.
- `instance.pause()` / `instance.resume()` / `instance.paused` pause and resume typing.
- `instance.type(content: string | Node): Promise<void>` appends content and types it after earlier typing finishes. A string becomes a new paragraph; pass a node for custom markup. Without `animate`, the content is added instantly with ink wear.
- `instance.muted = true` silences the sounds; `instance.setVolume(0.7)` changes the volume; `instance.setSound(true | false | engine)` turns sound on or off or switches engines at any time.
- `instance.destroy()` restores the elements to their original nodes, classes and styles (appended content is removed).
- `MechanicalSoundEngine` can be used on its own (`playKeyClick(isSpace)`, `playCarriageDing()`, `playCarriageReturn()`, `setVolume()`).

The full reference is generated from the types: **[API reference](https://vlikcc.github.io/daktilo.js/api/)**.

Elements with a `data-daktilo-ignore` attribute and the contents of `script`, `style`, `textarea` and `svg` are left untouched.

## Sound

Like a real machine:

- **Keys and space bar:** every key clicks, and the space bar thuds.
- **Margin bell:** rings once per line, about six characters before the right margin.
- **Carriage return:** every new line plays the ratchet of the carriage sliding back.

The audio context is unlocked silently on the first `pointerdown`/`keydown` interaction (browser autoplay policy). A custom `SoundEngine` implements `playKeyClick(isSpace)`, `playCarriageDing()`, `dispose()` and optionally `playCarriageReturn()` and `setVolume()`.

## React

```tsx
import { DaktiloSheet, useDaktilo } from 'daktilo-js/react';

export function Essay() {
  return (
    <DaktiloSheet paper="vintage" animate stamp={{ docNo: '#84-A' }} onReady={(d) => console.log(d)}>
      <h1>Night Notes</h1>
      <p>The mark of mechanical keys on paper…</p>
    </DaktiloSheet>
  );
}

// Or with the hook:
function Notes() {
  const { ref, daktilo } = useDaktilo<HTMLElement>({ animate: true });
  return (
    <article ref={ref} onClick={() => daktilo?.skip()}>
      …
    </article>
  );
}
```

Supports React 18 and 19. Daktilo rearranges the DOM, so `DaktiloSheet` freezes its children until `resetKey` changes; pass a new `resetKey` to retype dynamic content. Event callbacks always use the latest render. For a recorded sound engine, pass a factory (`sound: () => new SampleSoundEngine({...})`) so each mount (including StrictMode's double mount) gets its own engine.

## Vue

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { DaktiloSheet, vDaktilo } from 'daktilo-js/vue';

const done = ref(false);
</script>

<template>
  <DaktiloSheet paper="auto" animate :stamp="{ docNo: '#84-A' }" @complete="done = true">
    <h1>Night Notes</h1>
    <p>The mark of mechanical keys on paper…</p>
  </DaktiloSheet>

  <!-- or the directive -->
  <article v-daktilo="{ paper: 'clean', inkWear: 0.5 }">…</article>
</template>
```

Props are the options; events are `ready`, `char`, `line` and `complete`. As with React, the slot is frozen until `reset-key` changes. Vue 3.3+.

## Svelte

```svelte
<script>
  import { daktilo } from 'daktilo-js/svelte';
</script>

<article use:daktilo={{ paper: 'vintage', animate: true, onReady: (d) => console.log(d) }}>
  <h1>Night Notes</h1>
</article>
```

An action, so it works with Svelte 3, 4 and 5 and adds no dependency. Changing the options restarts the paper.

## Astro

```astro
---
import DaktiloSheet from 'daktilo-js/astro';
---

<DaktiloSheet paper="vintage" animate stamp={{ docNo: '#84-A', classification: 'ARCHIVE' }}>
  <h1>Night Notes</h1>
  <p>The mark of mechanical keys on paper…</p>
</DaktiloSheet>
```

All JSON-serializable options are supported (not callbacks or `SoundEngine` objects). Works with View Transitions. CI builds [an example project](examples/astro) with the latest Astro.

## Tailwind CSS

The plugin adds the Daktilo classes to the components layer, so you get the paper look without JavaScript. It also adds `font-typewriter`, `font-typewriter-title` and `text-daktilo-*` / `bg-daktilo-*` colours.

```js
// Tailwind v3 — tailwind.config.js
module.exports = { plugins: [require('daktilo-js/tailwind')] };
```

```css
/* Tailwind v4 */
@import 'tailwindcss';
@plugin "daktilo-js/tailwind";
```

```html
<article class="daktilo-sheet daktilo-theme-vintage">…</article>
```

Without Tailwind, the same stylesheet is available as `daktilo-js/style.css`.

## Paper textures

`daktilo-js/textures` adds a coffee `stain`, `fold` creases, punched `holes` and `aged` edges, drawn with CSS gradients (no images). They are hidden when printing.

```ts
import { applyTextures } from 'daktilo-js/textures';

const remove = applyTextures(document.querySelector('#essay')!, ['stain', 'fold']);
```

With the Web Component: `<daktilo-sheet texture="stain fold">`. On a CDN: `dist/textures.global.js` → `DaktiloTextures.applyTextures`.

## Writer mode

`daktilo-js/editor` turns a `<textarea>` or `contenteditable` element into a typewriter: keys click, space thuds, Enter plays the carriage return. The text itself is never changed.

```ts
import { DaktiloWriter } from 'daktilo-js/editor';

const writer = new DaktiloWriter('#draft', {
  paper: 'clean',
  bellColumn: 60, // margin bell, like a real typewriter
  noErase: true, // what's on paper stays on paper: blocks delete, cut and undo
});
writer.destroy();
```

On a CDN, `dist/editor.global.js` loads as `DaktiloEditor.DaktiloWriter`.

## Keyboards

Typos strike a key next to the intended one. The core ships the Turkish Q layout; `daktilo-js/keyboards` provides `TURKISH_Q`, `TURKISH_F`, `QWERTY`, `QWERTZ`, `AZERTY` and `QWERTY_ES` (CDN: `DaktiloKeyboards`). A custom layout is just an array of lowercase letter rows.

## Real typewriter recordings

The core works with file-free synthesis. To use a real recording, pass a `SampleSoundEngine` from the optional `daktilo-js/samples` module (not included in the core, ~1.8 KB gzip):

```ts
import { Daktilo } from 'daktilo-js';
import { SampleSoundEngine } from 'daktilo-js/samples';

new Daktilo('#my-essay', {
  animate: true,
  sound: new SampleSoundEngine({
    key: '/sounds/typewriter-keys.mp3', // key strike recording
    bell: '/sounds/typewriter-bell.mp3', // bell (+ carriage return)
    volume: 0.4,
  }),
});
```

On a CDN, `dist/samples.global.js` loads as `DaktiloSamples.SampleSoundEngine`.

- Strikes in the `key` recording are detected automatically from sudden rises in energy; each keystroke plays a random strike, the space bar plays it lower. Recordings with at least ~70 ms of silence between strikes work best.
- With only `bell`, the recording is treated as "bell + carriage return" and plays at the start of each line. Pass a separate `return` recording to ring `bell` at the margin and play `return` at each new line.
- Recordings are decoded after audio is unlocked; until then, or if loading fails, the synth is used.
- The engine belongs to the `Daktilo` instance: `destroy()` disposes it too, so create a new one per instance.

The files in `playground/sounds/` are derived from a Freesound recording (`type-writing-6834`): 24 key strikes and a bell + carriage return.

## Notes

- **Accessibility:** Ink defects use inline `position: relative` spans, so words are never split and screen readers read whole words. Mistyped letters are `aria-hidden` and unselectable. While typing, the half-typed text is `aria-hidden` and screen readers read the full text from a visually hidden copy; the container carries `aria-busy="true"`.
- **Performance:** Only letters with a defect get a span; the rest stays merged in single text nodes (a 10,000-word article gets its ink in ~0.1 s). Existing elements and event listeners are preserved. Line wraps are measured relative to the paper, so scrolling never triggers a false bell. Typing waits (max. 1.5 s) for the fonts so the font swap doesn't reflow lines mid-typing.
- **Unicode:** Text is split into graphemes (`Intl.Segmenter`), so combining accents and emoji sequences are never split; `&nbsp;` is preserved.
- **Printing:** Shadows and the cursor are hidden and the paper colours are kept.
- **Privacy:** `fonts: true` requests fonts from Google. To avoid third-party requests (e.g. GDPR), self-host the fonts and pass the stylesheet URL (`fonts: '/fonts/daktilo.css'`) or `fonts: false`.
- **CSP:** With a strict `style-src`, use `styles: false` and load `daktilo-js/style.css` yourself. Ink effects use CSSOM, which CSP allows.

## Development

```bash
npm install
npm test               # vitest + jsdom
npm run test:coverage  # coverage report in coverage/
npm run build          # dist/: ESM, CJS, IIFE, types and daktilo.css
npm run test:e2e       # Playwright: Chromium, Firefox, WebKit (visual + performance tests on Chromium)
npm run lint           # ESLint
npm run format         # Prettier
npm run typecheck
npm run size           # core gzip size check: ESM < 6 KB, CJS/IIFE < 6.5 KB
npm run lint:pkg       # publint + Are the Types Wrong?
npm run docs           # API reference in api/
npm run demo:gif       # regenerates docs/demo.gif
npm run playground     # builds and serves http://127.0.0.1:5173/playground/
npx changeset          # describe a change for the next release
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the conventions. The playground and the API reference are deployed to GitHub Pages from `main`; releases are cut with the manual **Release** workflow. The product requirements document is in [`docs/`](docs/daktilo-js-prd.pdf).

## License

MIT
