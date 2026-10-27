---
'daktilo-js': minor
---

New playback API, bug fixes and the first ecosystem modules.

- New: `pause()`, `resume()`, `paused`, `muted`, `setVolume()` and `type(content)`, which types new content after earlier typing finishes.
- New options: `onChar`, `onLine`, `onComplete`, `startOnVisible`, `autoScroll`, `keyboard`, `styles`; `fonts` also accepts a stylesheet URL; the stamp gained `labels` and `locale`.
- Fixed: `&nbsp;` survives the animation; line wraps are measured against the paper, so scrolling no longer rings false bells; combining accents and emoji sequences are never split; no typos inside `code`/`kbd`/`pre`; `skip()` keeps already-typed letters and their ink.
- Accessibility: while typing, screen readers read the full text from a visually hidden copy; typing starts once the fonts have loaded.
- New modules: `daktilo-js/keyboards`, `daktilo-js/editor` (Writer mode), `daktilo-js/react`, `daktilo-js/tailwind`, `daktilo-js/astro`, `daktilo-js/style.css`.
- The core size budget is now 6 KB (ESM, min + gzip; CJS/IIFE 6.5 KB).
