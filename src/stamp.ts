import type { StampMetadata } from './types';

export function renderStamp(stamp: StampMetadata): HTMLElement {
  const header = document.createElement('div');
  header.className = 'daktilo-meta-header';

  const info = document.createElement('span');
  info.textContent = [
    `KAYIT: ${stamp.docNo || '#001'}`,
    `TARİH: ${stamp.date || new Date().toLocaleDateString('tr-TR')}`,
    stamp.author && `YAZAN: ${stamp.author}`,
  ]
    .filter(Boolean)
    .join(' // ');
  header.append(info);

  if (stamp.classification) {
    const box = document.createElement('span');
    box.className = 'daktilo-stamp-box';
    box.textContent = stamp.classification;
    header.append(box);
  }
  return header;
}
