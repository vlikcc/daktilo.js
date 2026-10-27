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

test('paylaşım bağlantısı tüm ayarları geri yükler', async ({ page, context }) => {
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.goto('/playground/');
  await page.selectOption('select[name="paper"]', 'carbon');
  await page.selectOption('select[name="keyboard"]', 'AZERTY');
  await page.check('input[name="texture"][value="stain"]');
  await page.uncheck('input[name="stamp"]');
  await page.fill('textarea[name="text"]', 'Paylaşılan metin');
  // Ayarlar 250 ms gecikmeyle adrese yazılır: son değişiklik (metin) görünene kadar bekle.
  await expect
    .poll(() => page.evaluate(() => new URLSearchParams(location.hash.slice(1)).get('text')))
    .toBe('Paylaşılan metin');
  const url = page.url();

  const copy = await context.newPage();
  await copy.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await copy.goto(url);
  await expect(copy.locator('select[name="paper"]')).toHaveValue('carbon');
  await expect(copy.locator('select[name="keyboard"]')).toHaveValue('AZERTY');
  await expect(copy.locator('input[name="texture"][value="stain"]')).toBeChecked();
  await expect(copy.locator('input[name="stamp"]')).not.toBeChecked();
  await expect(copy.locator('#sheet')).toHaveClass(/daktilo-theme-carbon/);
  await expect(copy.locator('#sheet')).toHaveClass(/daktilo-texture-stain/);
  await expect(copy.locator('#sheet .daktilo-meta-header')).toHaveCount(0);
  await expect(copy.locator('#code')).toContainText("applyTextures(document.querySelector('#yazi'), ['stain'])");
});
