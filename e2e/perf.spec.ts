import { expect, test } from '@playwright/test';

// PRD performans hedefi: 10.000+ kelimelik makalelerde DOM şişmemeli ve sayfa takılmamalı.
// Süre sınırları CI makineleri için cömert tutulmuştur; gerileme yakalamak içindir, kıyas için değil.
test.skip(({ browserName }) => browserName !== 'chromium', 'ölçümler yalnızca Chromium için');

const WORDS = 10_000;

test.beforeEach(async ({ page }) => {
  await page.goto('/e2e/fixture.html');
  await page.evaluate((count) => {
    const words = 'mekanik tuşların kağıt üzerindeki izi dijital ekranın soğukluğunu kırar'.split(' ');
    const paragraphs: string[] = [];
    for (let i = 0; i < count; i += 100) {
      paragraphs.push(`<p>${Array.from({ length: 100 }, (_, j) => words[(i + j) % words.length]).join(' ')}.</p>`);
    }
    const sheet = document.getElementById('sheet')!;
    sheet.innerHTML = paragraphs.join('');
  }, WORDS);
});

test('10.000 kelimede mürekkep kusuru hızlı uygulanır ve DOM şişmez', async ({ page }) => {
  const result = await page.evaluate(() => {
    const sheet = document.getElementById('sheet')!;
    const letters = sheet.textContent!.replace(/\s/g, '').length;
    const started = performance.now();
    new window.Daktilo.Daktilo(sheet, { fonts: false, inkWear: 0.35 });
    const ms = performance.now() - started;
    return { ms, letters, spans: sheet.querySelectorAll('.daktilo-ink').length };
  });
  console.log(`mürekkep: ${result.letters} harf, ${result.spans} span, ${result.ms.toFixed(0)} ms`);
  expect(result.ms).toBeLessThan(1500);
  // Yalnızca kusurlu harfler span'e alınır: ~%35 eskime + %3 dağılma.
  expect(result.spans / result.letters).toBeLessThan(0.45);
});

test('10.000 kelimelik yazım animasyonu skip() ile hızla tamamlanır', async ({ page }) => {
  const ms = await page.evaluate(async () => {
    const sheet = document.getElementById('sheet')!;
    const d = new window.Daktilo.Daktilo(sheet, { fonts: false, animate: true, inkWear: 0.35 });
    const started = performance.now();
    d.skip();
    await d.finished;
    return performance.now() - started;
  });
  console.log(`skip: ${ms.toFixed(0)} ms`);
  expect(ms).toBeLessThan(4000);
  await expect(page.locator('#sheet p')).toHaveCount(WORDS / 100);
});

test('yazım sırasında her harf ana iş parçacığını kısa tutar', async ({ page }) => {
  const longest = await page.evaluate(async () => {
    const sheet = document.getElementById('sheet')!;
    const p = sheet.querySelectorAll('p');
    p.forEach((el, i) => i > 0 && el.remove());
    let worst = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) worst = Math.max(worst, entry.duration);
    });
    observer.observe({ type: 'longtask', buffered: false });
    await new window.Daktilo.Daktilo(sheet, { fonts: false, animate: true, speed: 1, typoRate: 0.01 }).finished;
    observer.disconnect();
    return worst;
  });
  // longtask yalnızca 50 ms'yi aşan görevleri raporlar; hiç olmamalı.
  expect(longest).toBe(0);
});
