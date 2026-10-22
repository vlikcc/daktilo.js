import { collectTextNodes } from './dom';

export const INK_BLEED_RATE = 0.03;

/**
 * Karaktere mürekkep kusuru düşerse onu taşıyan span'i, düz kalacaksa null döndürür.
 * Kayma `transform` yerine inline `position:relative` ile yapılır: inline-block harfler
 * kelime ortasında satır kırılmasına izin verir ve ekran okuyucuda kelimeyi böler.
 */
export function inkSpan(char: string, wear: number, rand: () => number = Math.random): HTMLSpanElement | null {
  if (wear <= 0 || /\s/.test(char)) return null;
  const worn = rand() < wear;
  const bleed = rand() < INK_BLEED_RATE;
  if (!worn && !bleed) return null;
  const span = document.createElement('span');
  span.className = 'daktilo-ink';
  span.textContent = char;
  if (worn) {
    span.style.top = `${((rand() - 0.5) * 1.2).toFixed(2)}px`;
    span.style.opacity = (0.72 + rand() * 0.28).toFixed(2);
  }
  if (bleed) span.style.textShadow = '0 0 .4px currentColor';
  return span;
}

/** Metin düğümlerine organik mürekkep kusuru uygular; kusursuz harfler tek bir TextNode'da birleşik kalır. */
export function applyInkWear(root: Node, wear: number): void {
  if (wear <= 0) return;
  for (const node of collectTextNodes(root)) {
    const frag = document.createDocumentFragment();
    let plain = '';
    let changed = false;
    for (const char of node.nodeValue ?? '') {
      const span = inkSpan(char, wear);
      if (!span) {
        plain += char;
        continue;
      }
      if (plain) frag.append(plain);
      frag.append(span);
      plain = '';
      changed = true;
    }
    if (!changed) continue;
    if (plain) frag.append(plain);
    node.replaceWith(frag);
  }
}
