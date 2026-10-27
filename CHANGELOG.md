# daktilo-js

## 1.1.0

### Minor Changes

- 3b7b0c0: Web Component, Vue and Svelte, themes, realistic carriage sounds and paper textures.

  - New `daktilo-js/element`: a `<daktilo-sheet>` Web Component configured with attributes, for WordPress, Ghost, Hugo or plain HTML (`dist/element.global.js` is a single script tag).
  - New `daktilo-js/vue` (`<DaktiloSheet>` and `v-daktilo`) and `daktilo-js/svelte` (`use:daktilo`).
  - New `daktilo-js/textures`: coffee stain, fold creases, punched holes and aged edges.
  - `paper: 'auto'` follows the system's dark mode; `paper` also accepts custom colours.
  - Realistic carriage: the margin bell rings once per line before the right margin and new lines play a synthesized carriage return (`SoundEngine.playCarriageReturn`, optional). `SampleSoundEngine` accepts a separate `return` recording.
  - `<mark>` and `.daktilo-red` print with the red ribbon; print styles hide the shadow and cursor.
  - New `setSound()` turns sound on or off or switches engines after creation.
  - Fixed: `onComplete` is not called by an instance whose sheet was taken over; React keeps Daktilo classes when `className` changes; a later `fonts: true` instance waits for the fonts.
  - The React wrapper now supports React >= 18 (tested with 18 and 19).

- c839aa6: New playback API, bug fixes and the first ecosystem modules.

  - New: `pause()`, `resume()`, `paused`, `muted`, `setVolume()` and `type(content)`, which types new content after earlier typing finishes.
  - New options: `onChar`, `onLine`, `onComplete`, `startOnVisible`, `autoScroll`, `keyboard`, `styles`; `fonts` also accepts a stylesheet URL; the stamp gained `labels` and `locale`.
  - Fixed: `&nbsp;` survives the animation; line wraps are measured against the paper, so scrolling no longer rings false bells; combining accents and emoji sequences are never split; no typos inside `code`/`kbd`/`pre`; `skip()` keeps already-typed letters and their ink.
  - Accessibility: while typing, screen readers read the full text from a visually hidden copy; typing starts once the fonts have loaded.
  - New modules: `daktilo-js/keyboards`, `daktilo-js/editor` (Writer mode), `daktilo-js/react`, `daktilo-js/tailwind`, `daktilo-js/astro`, `daktilo-js/style.css`.
  - The core size budget is now 6 KB (ESM, min + gzip; CJS/IIFE 6.5 KB).

This file is maintained by [Changesets](https://github.com/changesets/changesets): unreleased changes live in `.changeset/` and are added here by the Release workflow.

## 1.0.0

### Major Changes

- First release (MVP): three paper themes (`vintage`, `clean`, `carbon`), organic ink simulation, the overstrike typing engine, file-free mechanical sound with Web Audio, the document stamp, `skip()` / `destroy()`, SSR safety and `prefers-reduced-motion` support.
- Optional `daktilo-js/samples` module: `SampleSoundEngine` plays real typewriter recordings.

### Patch Changes

- Recorded keystrokes play at full level; only the last 15 ms are faded to avoid clicks.
- Playground: the speed slider is shown in characters per second.
