export function mount(html: string): HTMLElement {
  document.body.innerHTML = `<article id="essay">${html}</article>`;
  return document.getElementById('essay') as HTMLElement;
}

/** Overstrike (hatalı harf) span'leri hariç görünen metin. */
export function visibleText(el: Element): string {
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll('.daktilo-overstrike, .daktilo-meta-header').forEach((n) => n.remove());
  return clone.textContent ?? '';
}

export function setReducedMotion(reduced: boolean): void {
  window.matchMedia = ((query: string) => ({
    matches: reduced && query.includes('reduce'),
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}
