# daktilo-js

[![CI](https://github.com/vlikcc/daktilo.js/actions/workflows/ci.yml/badge.svg)](https://github.com/vlikcc/daktilo.js/actions/workflows/ci.yml)

**English** · [Türkçe](README.tr.md) · [Playground](https://vlikcc.github.io/daktilo.js/)

A **zero-dependency** micro-library that turns any HTML container into a realistic sheet of typewriter paper with a single options object.

- **Paper themes:** `vintage` (straw paper), `clean` (modern white), `carbon` (dark carbon)
- **Organic ink:** per-letter vertical jitter, ribbon wear and ink bleed
- **Overstrike typing engine:** mistakes are never erased — an `x` is struck over them; human rhythm that pauses on punctuation
- **File-free sound:** key, space and carriage-return bell synthesized live with the Web Audio API; optionally use a [real typewriter recording](#real-typewriter-recordings)
- **Playback control:** `pause()`, `resume()`, `skip()`, `type()` to append text, events, mute and volume
- **Accessible:** screen readers get the full text while typing; respects `prefers-reduced-motion`
- **< 6 KB** (minified + gzip), TypeScript types included, SSR-safe
- **Ecosystem:** React, Astro, Tailwind CSS plugin, Writer mode for `<textarea>` / `contenteditable`, keyboard layouts

## Install

```bash
npm i daktilo-js
```

### CDN

```html
<article id="my-essay">
  <h1>Night Notes</h1>
  <p>The mark of mechanical keys on paper breaks the coldness of the digital screen…</p>
</article>

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
| `paper`                | `'vintage'`  | `'vintage' \| 'clean' \| 'carbon'`                                                                     |
| `ribbonColor`          | theme colour | Ribbon/accent colour (links, stamp, overstrike, cursor)                                                |
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
| `onLine(el)`           | –            | Called at each new line, together with the bell                                                        |
| `onComplete()`         | –            | Called once the initial typing finishes or is skipped (not after `destroy()`)                          |

`stamp.labels` defaults to Turkish (`KAYIT`, `TARİH`, `YAZAN`) and `stamp.locale` to `'tr-TR'`; set them for other languages.

## API

- `instance.finished: Promise<void>` resolves when the initial typing finishes (or is skipped / destroyed).
- `instance.skip()` instantly completes the current and queued typing. Already-typed letters keep their ink.
- `instance.pause()` / `instance.resume()` / `instance.paused` pause and resume typing.
- `instance.type(content: string | Node): Promise<void>` appends content and types it after earlier typing finishes. A string becomes a new paragraph; pass a node for custom markup. Without `animate`, the content is added instantly with ink wear.
- `instance.muted = true` silences keys and bell; `instance.setVolume(0.7)` changes the volume.
- `instance.destroy()` restores the elements to their original nodes, classes and styles (appended content is removed).
- `MechanicalSoundEngine` can be used on its own (`playKeyClick(isSpace)`, `playCarriageDing()`, `setVolume()`).

Elements with a `data-daktilo-ignore` attribute and the contents of `script`, `style`, `textarea` and `svg` are left untouched.

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

Daktilo rearranges the DOM, so `DaktiloSheet` freezes its children until `resetKey` changes; pass a new `resetKey` to retype dynamic content. Event callbacks always use the latest render. For a recorded sound engine, pass a factory (`sound: () => new SampleSoundEngine({...})`) so each mount (including StrictMode's double mount) gets its own engine.

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

All JSON-serializable options are supported (not callbacks or `SoundEngine` objects). Works with View Transitions.

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

## Writer mode

`daktilo-js/editor` turns a `<textarea>` or `contenteditable` element into a typewriter: keys click, space thuds, Enter rings the bell. The text itself is never changed.

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

The core works with file-free synthesis. To use a real recording, pass a `SampleSoundEngine` from the optional `daktilo-js/samples` module (not included in the core, ~1.7 KB gzip):

```ts
import { Daktilo } from 'daktilo-js';
import { SampleSoundEngine } from 'daktilo-js/samples';

new Daktilo('#my-essay', {
  animate: true,
  sound: new SampleSoundEngine({
    key: '/sounds/typewriter-keys.mp3', // key strike recording
    bell: '/sounds/typewriter-bell.mp3', // carriage-return bell
    volume: 0.4,
  }),
});
```

On a CDN, `dist/samples.global.js` loads as `DaktiloSamples.SampleSoundEngine`.

- Strikes in the `key` recording are detected automatically from sudden rises in energy; each keystroke plays a random strike, the space bar plays it lower. Recordings with at least ~70 ms of silence between strikes work best.
- The `bell` recording is played as-is at line ends.
- Recordings are decoded after audio is unlocked; until then, or if loading fails, the synth is used.
- The engine belongs to the `Daktilo` instance: `destroy()` disposes it too, so create a new one per instance.

The files in `playground/sounds/` are derived from a Freesound recording (`type-writing-6834`): 24 key strikes and a bell + carriage return.

## Notes

- **Accessibility:** Ink defects use inline `position: relative` spans, so words are never split and screen readers read whole words. Mistyped letters are `aria-hidden` and unselectable. While typing, the half-typed text is `aria-hidden` and screen readers read the full text from a visually hidden copy; the container carries `aria-busy="true"`.
- **Performance:** Only letters with a defect get a span; the rest stays merged in single text nodes. Existing elements and event listeners are preserved. Line wraps are measured relative to the paper, so scrolling never triggers a false bell. Typing waits (max. 1.5 s) for the fonts so the font swap doesn't reflow lines mid-typing.
- **Unicode:** Text is split into graphemes (`Intl.Segmenter`), so combining accents and emoji sequences are never split; `&nbsp;` is preserved.
- **Privacy:** `fonts: true` requests fonts from Google. To avoid third-party requests (e.g. GDPR), self-host the fonts and pass the stylesheet URL (`fonts: '/fonts/daktilo.css'`) or `fonts: false`.
- **CSP:** With a strict `style-src`, use `styles: false` and load `daktilo-js/style.css` yourself. Ink effects use CSSOM, which CSP allows.
- **Autoplay policy:** The audio context is unlocked silently on the first `pointerdown`/`keydown` interaction.

## Development

```bash
npm install
npm test               # vitest + jsdom
npm run test:coverage  # coverage report in coverage/
npm run test:e2e       # Playwright (real Chromium); run npm run build first
npm run lint           # ESLint
npm run format         # Prettier
npm run typecheck
npm run build          # dist/: ESM, CJS, IIFE, types and daktilo.css
npm run size           # core gzip size < 6 KB check
npm run lint:pkg       # publint + Are the Types Wrong?
npm run playground     # builds and serves http://127.0.0.1:5173/playground/
npx changeset          # describe a change for the next release
```

The playground is deployed to GitHub Pages from `main`. The product requirements document is in [`docs/`](docs/daktilo-js-prd.pdf).

## License

MIT
