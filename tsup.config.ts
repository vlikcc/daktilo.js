import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm', 'iife'],
  globalName: 'Daktilo',
  target: 'es2022',
  dts: true,
  minify: true,
  clean: true,
  outExtension: ({ format }) => ({
    js: format === 'cjs' ? '.cjs' : format === 'esm' ? '.mjs' : '.global.js',
  }),
});
