import type { StampMetadata } from './types';

export function renderStamp(stamp: StampMetadata): HTMLElement {
  const header = document.createElement('div');
  header.className = 'daktilo-meta-header';

  const labels = { docNo: 'KAYIT', date: 'TARİH', author: 'YAZAN', ...stamp.labels };
  const info = document.createElement('span');
  info.textContent = [
    `${labels.docNo}: ${stamp.docNo || '#001'}`,
    `${labels.date}: ${stamp.date || new Date().toLocaleDateString(stamp.locale || 'tr-TR')}`,
    stamp.author && `${labels.author}: ${stamp.author}`,
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
