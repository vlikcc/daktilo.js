import { expect, test, type Page } from '@playwright/test';

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

test("paper: 'auto' sistem temasına göre vintage veya carbon renklerini kullanır", async ({ page }) => {
  await page.evaluate(() => window.start('<p>abc</p>', { paper: 'auto', animate: false }));
  const paperColor = () =>
    page.locator('#sheet').evaluate((el) => getComputedStyle(el).getPropertyValue('--daktilo-paper').trim());
  await page.emulateMedia({ colorScheme: 'light' });
  expect(await paperColor()).toBe('#f4f1ea');
  await page.emulateMedia({ colorScheme: 'dark' });
  expect(await paperColor()).toBe('#18181b');
});

test('yazdırırken gölge ve imleç gizlenir; <mark> kırmızı şeritle basılır', async ({ page }) => {
  await page.evaluate(() => {
    void window.start('<p>önemli <mark>kırmızı</mark> uzun bir metin</p>', { speed: 200 });
  });
  const ribbon = await page
    .locator('#sheet')
    .evaluate((el) => getComputedStyle(el).getPropertyValue('--daktilo-ribbon').trim());
  await page.emulateMedia({ media: 'print' });
  expect(await page.locator('#sheet').evaluate((el) => getComputedStyle(el).boxShadow)).toBe('none');
  expect(await page.locator('.daktilo-cursor').evaluate((el) => getComputedStyle(el).display)).toBe('none');
  await page.evaluate(() => window.daktilo.skip());
  const mark = await page.locator('#sheet mark').evaluate((el) => {
    const probe = document.createElement('span');
    probe.style.color = getComputedStyle(el.closest('#sheet')!).getPropertyValue('--daktilo-ribbon');
    document.body.append(probe);
    const expected = getComputedStyle(probe).color;
    probe.remove();
    return { color: getComputedStyle(el).color, expected, background: getComputedStyle(el).backgroundColor };
  });
  expect(ribbon).toBe('#c84b31');
  expect(mark.color).toBe(mark.expected);
  expect(mark.background).toBe('rgba(0, 0, 0, 0)');
});
