import { expect, test } from '@playwright/test';

test('playground hatasız yüklenir; düzen, duraklatma ve type() çalışır', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => {
    if (!request.url().startsWith('https://fonts.googleapis.com/')) errors.push(`${request.url()} yüklenemedi`);
  });
  // Ağ erişimi olmayan ortamlarda dış font isteği beklenmez.
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());

  await page.goto('/playground/');
  await expect(page.locator('#sheet .daktilo-meta-header')).toBeVisible();

  await page.selectOption('select[name="keyboard"]', 'QWERTY');
  await expect(page.locator('#code')).toContainText('keyboard: DaktiloKeyboards.QWERTY');

  await page.click('#pause');
  await expect(page.locator('#pause')).toHaveAttribute('aria-pressed', 'true');
  await page.click('#pause');
  await page.click('#skip');
  await page.fill('#append-text', 'Son satır.');
  await page.click('#append button');
  // Playground yazım hatası yapar (typoRate): üzerine x basılan harfler görünen metne dahil değildir.
  const lastParagraph = () =>
    page
      .locator('#sheet p')
      .last()
      .evaluate((p) => {
        const clone = p.cloneNode(true) as Element;
        clone.querySelectorAll('.daktilo-overstrike').forEach((typo) => typo.remove());
        return clone.textContent;
      });
  await expect.poll(lastParagraph, { timeout: 10_000 }).toBe('Son satır.');

  await expect(page.locator('#writer')).toHaveClass(/daktilo-writer/);
  expect(errors).toEqual([]);
});
