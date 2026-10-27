import { writeFileSync } from 'node:fs';
import { defineConfig, type Options } from 'tsup';
import { CSS } from './src/styles';

const shared: Options = {
  format: ['cjs', 'esm', 'iife'],
  target: 'es2022',
  dts: true,
  minify: true,
  // Türkçe karakterler \uXXXX kaçışlarına çevrilmez; paket daha küçük kalır.
  esbuildOptions(options) {
    options.charset = 'utf8';
  },
  clean: false,
  outExtension: ({ format }) => ({
    js: format === 'cjs' ? '.cjs' : format === 'esm' ? '.mjs' : '.global.js',
  }),
};

// Ayrı derlemeler: her IIFE kendi global adını alır ve çekirdek paket kayıt desteğini taşımaz.
export default defineConfig([
  {
    ...shared,
    entry: { index: 'src/index.ts' },
    globalName: 'Daktilo',
    // JavaScript'siz kullanım ve katı CSP için (`styles: false`) çekirdek CSS ayrı dosya olarak da yayımlanır.
    onSuccess: async () => writeFileSync('dist/daktilo.css', `${CSS}\n`),
  },
  { ...shared, entry: { samples: 'src/samples.ts' }, globalName: 'DaktiloSamples' },
  { ...shared, entry: { keyboards: 'src/keyboards.ts' }, globalName: 'DaktiloKeyboards' },
  { ...shared, entry: { editor: 'src/editor.ts' }, globalName: 'DaktiloEditor' },
  // Web Component: ESM/CJS çekirdeği paket adıyla içe aktarır (tek kopya); CDN dosyası çekirdeği içerir.
  { ...shared, format: ['cjs', 'esm'], entry: { element: 'src/element.ts' }, external: ['daktilo-js'] },
  {
    ...shared,
    format: ['iife'],
    dts: false,
    entry: { element: 'src/element.ts' },
    globalName: 'DaktiloElement',
    esbuildOptions(options) {
      options.charset = 'utf8';
      options.alias = { 'daktilo-js': './src/index.ts' };
    },
  },
  // React sarmalayıcısı çekirdeği paket adıyla içe aktarır; uygulamada tek bir Daktilo kopyası bulunur.
  { ...shared, format: ['cjs', 'esm'], entry: { react: 'src/react.ts' }, external: ['react', 'daktilo-js'] },
  {
    ...shared,
    format: ['cjs', 'esm'],
    entry: { tailwind: 'src/tailwind.ts' },
    // Tailwind v3 `require('daktilo-js/tailwind')` ile eklentinin kendisini bekler.
    footer: ({ format }) =>
      format === 'cjs'
        ? {
            js: 'module.exports=Object.assign(module.exports.default,{default:module.exports.default,cssToJs:module.exports.cssToJs,toComponents:module.exports.toComponents});',
          }
        : {},
  },
]);
