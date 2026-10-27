// examples/astro derlemesini gerçek bir tarayıcıda açar ve DaktiloSheet'in çalıştığını doğrular.
import { chromium } from '@playwright/test';
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';

const ROOT = join(process.cwd(), 'examples/astro/dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };

const server = createServer((req, res) => {
  let file = normalize(join(ROOT, decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)));
  if (!file.startsWith(ROOT + sep) && file !== ROOT) return res.writeHead(403).end();
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
    statSync(file);
  } catch {
    return res.writeHead(404).end();
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));

const browser = await chromium.launch();
const errors = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);

  const sheet = page.locator('#static');
  await sheet.locator('.daktilo-stamp-box').waitFor();
  const classes = await sheet.getAttribute('class');
  if (!classes?.includes('daktilo-theme-clean')) throw new Error(`theme class missing: ${classes}`);
  if ((await sheet.locator('.daktilo-ink').count()) === 0) throw new Error('no ink wear applied');

  await page.waitForFunction(() => {
    const typed = document.querySelector('#typed');
    return typed?.querySelector('p')?.textContent === 'Typed letter by letter.' && !typed.hasAttribute('aria-busy');
  });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('✓ Astro example: DaktiloSheet renders and types');
} finally {
  await browser.close();
  server.close();
}
