import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const LIMIT = 5 * 1024;
const core = ['dist/index.mjs', 'dist/index.cjs', 'dist/index.global.js'];
const optional = ['dist/samples.mjs', 'dist/samples.global.js'];
const gzipKB = (file) => gzipSync(readFileSync(file), { level: 9 }).length;
let failed = false;

for (const file of core) {
  const size = gzipKB(file);
  const ok = size <= LIMIT;
  failed ||= !ok;
  console.log(`${ok ? '✓' : '✗'} ${file.padEnd(24)} ${(size / 1024).toFixed(2)} KB gzip (limit 5 KB)`);
}
for (const file of optional) {
  console.log(`  ${file.padEnd(24)} ${(gzipKB(file) / 1024).toFixed(2)} KB gzip (isteğe bağlı modül)`);
}

if (failed) process.exit(1);
