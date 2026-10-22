import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const LIMIT = 5 * 1024;
const files = ['dist/index.mjs', 'dist/index.cjs', 'dist/index.global.js'];
let failed = false;

for (const file of files) {
  const size = gzipSync(readFileSync(file), { level: 9 }).length;
  const ok = size <= LIMIT;
  failed ||= !ok;
  console.log(`${ok ? '✓' : '✗'} ${file.padEnd(22)} ${(size / 1024).toFixed(2)} KB gzip (limit 5 KB)`);
}

if (failed) process.exit(1);
