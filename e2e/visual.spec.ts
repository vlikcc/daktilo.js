import { expect, test, type Page } from '@playwright/test';

// Ekran görüntüleri tarayıcıya ve işletim sistemine göre farklılaştığından görsel testler yalnızca
// Chromium'da çalışır. Fontlar e2e/fonts altından yüklenir ve Math.random tohumlanır; böylece mürekkep
// kusurları da her çalıştırmada aynıdır. Referansları güncellemek için: npx playwright test --update-snapshots
test.skip(({ browserName }) => browserName !== 'chromium', 'görsel referanslar yalnızca Chromium için');

const TEXT = `<h1>Night Notes</h1>
<p>The mark of mechanical keys on paper breaks the coldness of the digital screen. Every letter is a
little crooked, a little faint; as the ribbon wears, the words grow old too. <a href="#">A link</a>.</p>`;

async function render(page: Page, options: Record<string, unknown>): Promise<void> {
  await page.addInitScript(() => {
    // mulberry32: tohumlu sözde rastgele sayı üreteci
    let seed = 42;
    Math.random = () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });
  await page.goto('/e2e/fixture.html');
  await page.evaluate(
    ({ html, opts }) => {
      document.getElementById('scroller')!.remove();
      document.getElementById('writer')!.remove();
      const sheet = document.createElement('article');
      sheet.id = 'visual';
      sheet.innerHTML = html;
      document.body.append(sheet);
      // Genişlik px: `ch` birimi font yüklenmeden önce yedek fonttan hesaplanabiliyor (CI'da 576 yerine 600 px).
      new window.Daktilo.Daktilo(sheet, { fonts: 'fonts/fonts.css', maxWidth: '576px', ...opts });
    },
    { html: TEXT, opts: options },
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.fonts.check("1em 'Courier Prime'"));
}

const SHOT = { animations: 'disabled', maxDiffPixelRatio: 0.01 } as const;

for (const paper of ['vintage', 'clean', 'carbon']) {
  test(`${paper} teması`, async ({ page }) => {
    await render(page, { paper, inkWear: 0.35 });
    await expect(page.locator('#visual')).toHaveScreenshot(`${paper}.png`, SHOT);
  });
}

test('evrak damgası ve overstrike', async ({ page }) => {
  await render(page, {
    paper: 'vintage',
    inkWear: 0,
    stamp: {
      docNo: '#84-A',
      date: '22.10.2026',
      author: 'V. K.',
      classification: 'ARCHIVE',
      labels: { docNo: 'REF', date: 'DATE', author: 'BY' },
    },
  });
  await page.evaluate(() => {
    const typo = document.createElement('span');
    typo.className = 'daktilo-overstrike';
    typo.dataset.strike = 'x';
    typo.textContent = 'w';
    document.querySelector('#visual p')!.prepend(typo);
  });
  await expect(page.locator('#visual')).toHaveScreenshot('stamp.png', SHOT);
});

test('kağıt dokuları', async ({ page }) => {
  await render(page, { paper: 'vintage', inkWear: 0 });
  await page.addScriptTag({ url: '/dist/textures.global.js' });
  await page.evaluate(() => {
    const { applyTextures } = (window as unknown as { DaktiloTextures: typeof import('../src/textures') })
      .DaktiloTextures;
    applyTextures(document.getElementById('visual')!, ['stain', 'fold', 'holes', 'aged']);
  });
  await expect(page.locator('#visual')).toHaveScreenshot('textures.png', SHOT);
});
