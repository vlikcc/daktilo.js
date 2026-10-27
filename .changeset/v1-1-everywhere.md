---
'daktilo-js': minor
---

Web Component, Vue and Svelte, themes, realistic carriage sounds and paper textures.

- New `daktilo-js/element`: a `<daktilo-sheet>` Web Component configured with attributes, for WordPress, Ghost, Hugo or plain HTML (`dist/element.global.js` is a single script tag).
- New `daktilo-js/vue` (`<DaktiloSheet>` and `v-daktilo`) and `daktilo-js/svelte` (`use:daktilo`).
- New `daktilo-js/textures`: coffee stain, fold creases, punched holes and aged edges.
- `paper: 'auto'` follows the system's dark mode; `paper` also accepts custom colours.
- Realistic carriage: the margin bell rings once per line before the right margin and new lines play a synthesized carriage return (`SoundEngine.playCarriageReturn`, optional). `SampleSoundEngine` accepts a separate `return` recording.
- `<mark>` and `.daktilo-red` print with the red ribbon; print styles hide the shadow and cursor.
- New `setSound()` turns sound on or off or switches engines after creation.
- Fixed: `onComplete` is not called by an instance whose sheet was taken over; React keeps Daktilo classes when `className` changes; a later `fonts: true` instance waits for the fonts.
- The React wrapper now supports React >= 18 (tested with 18 and 19).
