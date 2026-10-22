import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

// Yayımlanan "< 6 KB" iddiası, bundler kullanıcılarının aldığı ESM derlemesi içindir (size-limit ve
// bundlephobia da bunu ölçer). CJS ve IIFE, esbuild'in export yardımcıları yüzünden ~220 bayt büyüktür;
// onlar için ayrı ve biraz gevşek bir üst sınır uygulanır.
const KB = 1024;
const core = [
  ['dist/index.mjs', 6 * KB],
  ['dist/index.cjs', 6.5 * KB],
  ['dist/index.global.js', 6.5 * KB],
];
const optional = [
  'dist/samples.mjs',
  'dist/keyboards.mjs',
  'dist/editor.mjs',
  'dist/react.mjs',
  'dist/tailwind.mjs',
  'dist/daktilo.css',
];
const gzipKB = (file) => gzipSync(readFileSync(file), { level: 9 }).length;
let failed = false;

for (const [file, limit] of core) {
  const size = gzipKB(file);
  const ok = size <= limit;
  failed ||= !ok;
  console.log(`${ok ? '✓' : '✗'} ${file.padEnd(24)} ${(size / KB).toFixed(2)} KB gzip (limit ${limit / KB} KB)`);
}
for (const file of optional) {
  console.log(`  ${file.padEnd(24)} ${(gzipKB(file) / 1024).toFixed(2)} KB gzip (isteğe bağlı modül)`);
}

if (failed) process.exit(1);
