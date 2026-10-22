const STYLE_ID = 'daktilo-core-css';
const FONTS_ID = 'daktilo-fonts';
const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=Special+Elite&display=swap';

export const CSS = `.daktilo-sheet{font-family:'Courier Prime',Courier,monospace;max-width:var(--daktilo-width,65ch);margin:2rem auto;padding:3rem 2.5rem;line-height:1.75;position:relative;box-sizing:border-box;background:var(--daktilo-paper) radial-gradient(var(--daktilo-pore) 1px,#0000 0) 0 0/18px 18px;color:var(--daktilo-ink);box-shadow:0 4px 24px #00000014}
.daktilo-theme-vintage{--daktilo-paper:#f4f1ea;--daktilo-ink:#262421;--daktilo-ribbon:#c84b31;--daktilo-rule:#0003;--daktilo-pore:#00000009}
.daktilo-theme-clean{--daktilo-paper:#fafafa;--daktilo-ink:#141414;--daktilo-ribbon:#1d4ed8;--daktilo-rule:#00000026;--daktilo-pore:#00000003}
.daktilo-theme-carbon{--daktilo-paper:#18181b;--daktilo-ink:#e4e4e7;--daktilo-ribbon:#f59e0b;--daktilo-rule:#fff3;--daktilo-pore:#ffffff08;box-shadow:0 4px 24px #00000073}
.daktilo-sheet :is(h1,h2,h3){font-family:'Special Elite','Courier Prime',monospace;font-weight:400;border-bottom:2px dashed var(--daktilo-rule);padding-bottom:.4rem}
.daktilo-sheet a{color:var(--daktilo-ribbon);text-decoration:none;border-bottom:1px dashed}
.daktilo-sheet ::selection{background:var(--daktilo-ribbon);color:var(--daktilo-paper)}
.daktilo-ink,.daktilo-overstrike{position:relative}
.daktilo-overstrike{opacity:.75;-webkit-user-select:none;user-select:none}
.daktilo-overstrike[data-strike]::after{content:attr(data-strike);position:absolute;left:0;top:-1px;color:var(--daktilo-ribbon);font-weight:700}
.daktilo-meta-header{display:flex;flex-wrap:wrap;gap:.5rem 1rem;justify-content:space-between;align-items:center;font-size:.8rem;border-bottom:1px solid var(--daktilo-rule);padding-bottom:.75rem;margin-bottom:2rem;text-transform:uppercase;letter-spacing:1px}
.daktilo-stamp-box{display:inline-block;border:2px solid;color:var(--daktilo-ribbon);padding:1px 6px;font-family:'Special Elite',monospace;font-weight:700;transform:rotate(-3deg)}
.daktilo-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.daktilo-cursor{color:var(--daktilo-ribbon);animation:daktilo-blink 1s step-end infinite}
@keyframes daktilo-blink{50%{opacity:0}}
@media (prefers-reduced-motion:reduce){.daktilo-cursor{animation:none}}`;

/** Çekirdek stilleri ve isteğe bağlı fontları belgeye bir kez enjekte eder. */
export function injectStyles(fonts: boolean | string, styles: boolean): void {
  const head = document.head;
  if (fonts && !document.getElementById(FONTS_ID)) {
    const link = document.createElement('link');
    link.id = FONTS_ID;
    link.rel = 'stylesheet';
    link.href = typeof fonts === 'string' ? fonts : FONTS_URL;
    head.append(link);
  }
  if (styles && !document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    head.append(style);
  }
}

let fontsLoaded: Promise<unknown> | undefined;

/**
 * Daktilo fontları yüklenince (en fazla 1,5 sn sonra) çözülür. Yazım bundan önce başlarsa font
 * değişimi satırları yeniden akıtır ve satır sonu algılaması yanlış çan çalar.
 */
export function fontsReady(): Promise<unknown> {
  return (fontsLoaded ??= new Promise((resolve) => {
    const fonts = document.fonts;
    const link = document.getElementById(FONTS_ID) as HTMLLinkElement | null;
    const load = (): unknown =>
      Promise.all(['Courier Prime', 'Special Elite'].map((family) => fonts.load(`1em '${family}'`))).then(
        resolve,
        resolve,
      );
    if (!fonts) return resolve(0);
    setTimeout(resolve, 1500);
    if (!link || link.sheet) return load();
    link.addEventListener('load', load);
    link.addEventListener('error', resolve);
  }));
}
