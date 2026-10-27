const SKIPPED_TAGS = new Set(['script', 'style', 'noscript', 'textarea', 'template', 'svg', 'math']);

/** CSS'in daralttığı boşluklar; bölünmez boşluk (U+00A0) bunlara dahil değildir. */
export const COLLAPSIBLE = /[ \t\n\r\f]+/g;

let segmenter: Intl.Segmenter | undefined;

/** Metni kullanıcının gördüğü karakterlere (grapheme) böler: birleşik aksanlar ve emoji dizileri parçalanmaz. */
export function graphemes(text: string): Iterable<string> {
  if (typeof Intl === 'undefined' || !Intl.Segmenter) return text;
  segmenter ??= new Intl.Segmenter();
  return Array.from(segmenter.segment(text), (s) => s.segment);
}

// DOM sabitleri sayı olarak: küçültücü `Node.TEXT_NODE` gibi adları kısaltamaz.
export const ELEMENT_NODE = 1;
export const TEXT_NODE = 3;

/** `document.createElement` kısayolu; isteğe bağlı sınıf adı ve metinle. */
export function create<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = text;
  return el;
}

export const canUseDOM = (): boolean => typeof window !== 'undefined' && typeof document !== 'undefined';

export const prefersReducedMotion = (): boolean =>
  canUseDOM() && typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Daktilo efektlerinin dokunmaması gereken (içeriği metin olarak işlenmeyen) elemanlar. */
export const isSkipped = (el: Element): boolean =>
  SKIPPED_TAGS.has(el.localName) || el.hasAttribute('data-daktilo-ignore');

/** Atlanan alt ağaçlar hariç, boş olmayan tüm metin düğümleri. */
export function collectTextNodes(root: Node): Text[] {
  const nodes: Text[] = [];
  // 5 = SHOW_ELEMENT | SHOW_TEXT; 2 = FILTER_REJECT, 1 = FILTER_ACCEPT
  const walker = document.createTreeWalker(root, 5, {
    acceptNode: (node) => (node.nodeType === ELEMENT_NODE && isSkipped(node as Element) ? 2 : 1),
  });
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.nodeType === TEXT_NODE && node.nodeValue?.trim()) nodes.push(node as Text);
  }
  return nodes;
}

/**
 * Alt ağacın yapısını (orijinal düğüm nesneleri ve metin değerleri) kaydeder.
 * Dönen fonksiyon ağacı kayıt anındaki hâline geri getirir; düğümler yeniden
 * kullanıldığı için event listener'lar ve referanslar korunur.
 */
export function snapshot(root: Node): () => void {
  const children = new Map<ParentNode, Node[]>();
  const texts = new Map<Text, string>();
  const visit = (node: Node): void => {
    if (node.nodeType === TEXT_NODE) {
      texts.set(node as Text, node.nodeValue ?? '');
    } else if (node.hasChildNodes()) {
      const kids = Array.from(node.childNodes);
      children.set(node as unknown as ParentNode, kids);
      kids.forEach(visit);
    }
  };
  visit(root);
  return () => {
    texts.forEach((value, node) => (node.nodeValue = value));
    children.forEach((kids, parent) => parent.replaceChildren(...kids));
  };
}

/** Verilen attribute'ların mevcut değerlerini saklar; dönen fonksiyon onları geri yükler. */
export function preserveAttributes(el: Element, names: string[]): () => void {
  const saved = names.map((name) => el.getAttribute(name));
  return () =>
    names.forEach((name, i) => {
      const value = saved[i];
      if (value === null) el.removeAttribute(name);
      else el.setAttribute(name, value);
    });
}
