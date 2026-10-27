import { create } from './dom';
import type { PaperColors, PaperPreset, StampMetadata } from './types';

/** Kağıt sınıflarını ekler; özel renkler temanın CSS değişkenlerini satır içi ezer. */
export function applyPaper(el: HTMLElement, paper: PaperPreset | PaperColors): void {
  const custom = typeof paper === 'object';
  el.classList.add('daktilo-sheet', `daktilo-theme-${custom ? 'vintage' : paper}`);
  if (custom) for (const [key, value] of Object.entries(paper)) el.style.setProperty(`--daktilo-${key}`, value!);
}

export function renderStamp(stamp: StampMetadata): HTMLElement {
  const header = create('div', 'daktilo-meta-header');

  const labels = { docNo: 'KAYIT', date: 'TARİH', author: 'YAZAN', ...stamp.labels };
  const info = create(
    'span',
    '',
    [
      `${labels.docNo}: ${stamp.docNo || '#001'}`,
      `${labels.date}: ${stamp.date || new Date().toLocaleDateString(stamp.locale || 'tr-TR')}`,
      stamp.author && `${labels.author}: ${stamp.author}`,
    ]
      .filter(Boolean)
      .join(' // '),
  );
  header.append(info);

  if (stamp.classification) {
    header.append(create('span', 'daktilo-stamp-box', stamp.classification));
  }
  return header;
}
