import { expect, test } from '@playwright/test';

test('<daktilo-sheet> betik <head> içindeyken de tüm içeriği yazar', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/e2e/element.html');

  const staticSheet = page.locator('#static');
  await expect(staticSheet).toHaveClass(/daktilo-theme-carbon/);
  await expect(staticSheet.locator('.daktilo-stamp-box')).toHaveText('DRAFT');
  // Mürekkep, damgada değil içerikte de olmalı: eleman çocukları ayrıştırılmadan başlarsa içerik düz kalır.
  expect(await staticSheet.locator('p .daktilo-ink').count()).toBeGreaterThan(5);
  expect(await staticSheet.evaluate((el) => getComputedStyle(el).display)).toBe('block');

  await expect.poll(() => page.evaluate(() => (window as unknown as { events: string[] }).events)).toContain('typed');
  await expect(page.locator('#typed p')).toHaveText(['Typed by a custom element.', 'Second paragraph.']);
  // Her iki paragraf da tuş tuş yazılmış olmalı (ayrıştırıcının sonradan eklediği metin sayılmaz).
  const typed = await page.evaluate(() => (window as unknown as { typed: string }).typed);
  expect(typed).toBe('Typed by a custom element.Second paragraph.');
  expect(errors).toEqual([]);
});
