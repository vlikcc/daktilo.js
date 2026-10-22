import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    calls: { key: number; ding: number; chars: number; lines: number };
    countingSound: () => unknown;
    start: (html: string, options?: Record<string, unknown>) => Promise<void>;
    daktilo: { skip(): void; pause(): void; resume(): void };
    DaktiloEditor: { DaktiloWriter: new (target: string, options?: Record<string, unknown>) => unknown };
  }
}

const LONG = 'Mekanik tuşların kağıt üzerindeki izi dijital ekranın soğukluğunu kırar ve her harf biraz eğri kalır.';

/** Paragrafın tarayıcıda kapladığı satır sayısı. */
const lineCount = (page: Page): Promise<number> =>
  page.evaluate(() => {
    const p = document.querySelector('#sheet p')!;
    return Math.round(p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).lineHeight));
  });

test.beforeEach(async ({ page }) => {
  await page.goto('/e2e/fixture.html');
});

test('satır sarmasında, gerçek satır sayısı kadar çan çalar', async ({ page }) => {
  await page.evaluate((text) => window.start(`<p>${text}</p>`, { maxWidth: '24ch' }), LONG);
  const lines = await lineCount(page);
  expect(lines).toBeGreaterThan(3);
  expect(await page.evaluate(() => window.calls.lines)).toBe(lines - 1);
});

test('yazım sırasında kapsayıcı kaydırılsa da yanlış çan çalmaz', async ({ page }) => {
  await page.evaluate((text) => {
    const scroller = document.getElementById('scroller')!;
    let down = true;
    const timer = setInterval(() => {
      scroller.scrollTop = down ? 120 : 0;
      down = !down;
    }, 3);
    return window.start(`<p>${text}</p>`, { maxWidth: '24ch', speed: 4 }).finally(() => clearInterval(timer));
  }, LONG);
  expect(await page.evaluate(() => window.calls.lines)).toBe((await lineCount(page)) - 1);
});

test('yazım bitince DOM orijinal hâline eşittir; &nbsp; korunur', async ({ page }) => {
  const html = '<h1>Gece&nbsp;Notları</h1><p>10&nbsp;km <em>yol</em>, <a href="#x">bağlantı</a>.</p>';
  await page.evaluate((h) => window.start(h), html);
  const result = await page.locator('#sheet').evaluate((el) => el.innerHTML);
  expect(result).toBe(html);
});

test('yazım sürerken ekran okuyucu ağacı metnin tamamını içerir', async ({ page }) => {
  await page.evaluate((text) => {
    void window.start(`<p>${text}</p>`, { speed: 60 });
  }, LONG);
  await page.waitForTimeout(150);
  const snapshot = await page.locator('#sheet').ariaSnapshot();
  expect(snapshot).toContain(LONG);
  // Yarım yazılmış metin erişilebilirlik ağacında görünmez.
  expect(snapshot.match(/Mekanik/g)).toHaveLength(1);
  await page.evaluate(() => window.daktilo.skip());
});

test('Google Fonts erişilemezse yazım yine de başlar', async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  const started = Date.now();
  await page.evaluate(() => window.start('<p>abc</p>', { fonts: true }));
  expect(Date.now() - started).toBeLessThan(5000);
  await expect(page.locator('#sheet p')).toHaveText('abc');
});

test('pause() yazımı durdurur, resume() sürdürür', async ({ page }) => {
  await page.evaluate((text) => {
    void window.start(`<p>${text}</p>`, { speed: 30 });
  }, LONG);
  await page.waitForTimeout(200);
  await page.evaluate(() => window.daktilo.pause());
  const paused = await page.evaluate(() => window.calls.chars);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.calls.chars)).toBe(paused);
  await page.evaluate(() => window.daktilo.resume());
  await expect.poll(() => page.evaluate(() => window.calls.chars)).toBeGreaterThan(paused);
});

test('Yazar modu gerçek klavye girişinde ses çalar, noErase silmeyi engeller', async ({ page }) => {
  await page.evaluate(() => {
    new window.DaktiloEditor.DaktiloWriter('#writer', { sound: window.countingSound(), noErase: true, fonts: false });
  });
  const writer = page.locator('#writer');
  await writer.click();
  await page.keyboard.type('ab c');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Backspace');
  await expect(writer).toHaveValue('ab c\n');
  expect(await page.evaluate(() => window.calls)).toMatchObject({ key: 4, ding: 1 });
});
