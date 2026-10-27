# daktilo-js

This file is maintained by [Changesets](https://github.com/changesets/changesets): unreleased changes live in `.changeset/` and are added here by the Release workflow.

## 1.0.0

### Major Changes

- First release (MVP): three paper themes (`vintage`, `clean`, `carbon`), organic ink simulation, the overstrike typing engine, file-free mechanical sound with Web Audio, the document stamp, `skip()` / `destroy()`, SSR safety and `prefers-reduced-motion` support.
- Optional `daktilo-js/samples` module: `SampleSoundEngine` plays real typewriter recordings.

### Patch Changes

- Recorded keystrokes play at full level; only the last 15 ms are faded to avoid clicks.
- Playground: the speed slider is shown in characters per second.
