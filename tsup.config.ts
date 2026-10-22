import { defineConfig, type Options } from 'tsup';

const shared: Options = {
  format: ['cjs', 'esm', 'iife'],
  target: 'es2022',
  dts: true,
  minify: true,
  clean: false,
  outExtension: ({ format }) => ({
    js: format === 'cjs' ? '.cjs' : format === 'esm' ? '.mjs' : '.global.js',
  }),
};

// Ayrı derlemeler: her IIFE kendi global adını alır ve çekirdek paket kayıt desteğini taşımaz.
export default defineConfig([
  { ...shared, entry: { index: 'src/index.ts' }, globalName: 'Daktilo' },
  { ...shared, entry: { samples: 'src/samples.ts' }, globalName: 'DaktiloSamples' },
]);
