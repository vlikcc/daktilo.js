# daktilo-js + Astro example

Used by CI to check that `daktilo-js/astro` builds and runs in a real Astro project.

```bash
# from the repository root
npm run build && npm pack --pack-destination examples/astro
cd examples/astro
npm install && npm install --no-save ./daktilo-js-*.tgz
npm run build
node ../../scripts/check-astro.mjs   # from the repository root: node scripts/check-astro.mjs
```
