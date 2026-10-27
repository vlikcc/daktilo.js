// README'deki demo animasyonunu (docs/demo.gif) üretir: npm run build && npm run demo:gif
// Saat Playwright ile sabit adımlarla ilerletilir ve Math.random tohumlanır; çıktı neredeyse aynıdır
// (font yüklemesi gerçek ağ olayı olduğundan başlangıç bir kare kayabilir).
import { chromium } from '@playwright/test';
import gifenc from 'gifenc';
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { PNG } from 'pngjs';

const { GIFEncoder, applyPalette, quantize } = gifenc;
const PORT = 5199;
const STEP = 130; // ms: her karede ilerletilen sanal süre
const OUT = 'docs/demo.gif';

const server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: String(PORT) } });
process.on('exit', () => server.kill());
await new Promise((resolve, reject) => {
  server.stdout.once('data', resolve);
  server.once('exit', () => reject(new Error(`sunucu başlatılamadı (port ${PORT} dolu olabilir)`)));
});
const base = `http://127.0.0.1:${PORT}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 640, height: 420 }, deviceScaleFactor: 1 });
const START = new Date('2026-10-22T09:00:00');
await page.clock.install({ time: START });
// install() sonrasında zaman kendiliğinden akar; durdurulmazsa ekran görüntüsü alırken de ilerler.
await page.clock.pauseAt(new Date(START.getTime() + 1));
await page.addInitScript(() => {
  let seed = 7;
  Math.random = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
});
// Sayfa sunucunun kökeninden açılır: aksi hâlde fontlar CORS nedeniyle yüklenmez.
await page.goto(`${base}/e2e/fixture.html`);
await page.setContent(`<!doctype html><html><head><meta charset="utf-8">
<style>body{margin:0;background:#e9e5dc;padding:14px}</style>
<script src="${base}/dist/index.global.js"></script><script src="${base}/dist/textures.global.js"></script>
</head><body><article id="demo"><h1>Night Notes</h1>
<p>The mark of mechanical keys on paper breaks the coldness of the screen. Every letter is a little crooked, a little faint.</p></article></body></html>`);
await page.evaluate((fonts) => {
  const sheet = document.getElementById('demo');
  window.DaktiloTextures.applyTextures(sheet, ['stain']);
  window.demo = new window.Daktilo.Daktilo(sheet, {
    animate: true,
    fonts,
    maxWidth: '600px',
    typoRate: 0.025,
    keyboard: ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'],
    stamp: {
      docNo: '#84-A',
      classification: 'ARCHIVE',
      labels: { docNo: 'REF', date: 'DATE', author: 'BY' },
      locale: 'en-US',
      author: 'daktilo-js',
    },
  });
  window.done = false;
  window.demo.finished.then(() => (window.done = true));
}, `${base}/e2e/fonts/fonts.css`);
// Font yüklemesi gerçek ağ olayıdır; sayfa saati sahte olduğundan yoklama Node tarafında yapılır.
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
for (let i = 0; i < 100 && !(await page.evaluate(() => document.fonts.check("1em 'Courier Prime'"))); i++) {
  await sleep(50);
}
// Font sözü çözülünce yazım ilk zamanlayıcısını kurar; kareler ancak bundan sonra başlar.
await page.evaluate(() => document.fonts.ready);
await sleep(200);

const sheet = page.locator('#demo');
const box = await sheet.boundingBox();
const clip = { x: Math.floor(box.x), y: Math.floor(box.y), width: Math.ceil(box.width), height: 380 };
const gif = GIFEncoder();
let frames = 0;
const frame = async (delay) => {
  const png = PNG.sync.read(await page.screenshot({ clip, animations: 'allow' }));
  const palette = quantize(png.data, 64, { format: 'rgb444' });
  gif.writeFrame(applyPalette(png.data, palette, 'rgb444'), png.width, png.height, { palette, delay });
  frames++;
};

while (!(await page.evaluate(() => window.done)) && frames < 400) {
  await page.clock.runFor(STEP);
  await frame(STEP);
}
await frame(3000); // son hâli birkaç saniye göster
gif.finish();
writeFileSync(OUT, gif.bytes());
console.log(`${OUT}: ${frames} kare, ${(gif.bytes().length / 1024).toFixed(0)} KB`);

await browser.close();
server.kill();
