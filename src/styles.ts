const STYLE_ID = 'daktilo-core-css';
const FONTS_ID = 'daktilo-fonts';
const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=Special+Elite&display=swap';

const CSS = `.daktilo-sheet{font-family:'Courier Prime',Courier,monospace;max-width:var(--daktilo-width,65ch);margin:2rem auto;padding:3rem 2.5rem;line-height:1.75;position:relative;box-sizing:border-box;background-color:var(--daktilo-paper);color:var(--daktilo-ink);background-image:radial-gradient(var(--daktilo-pore) 1px,transparent 0);background-size:18px 18px;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.daktilo-theme-vintage{--daktilo-paper:#f4f1ea;--daktilo-ink:#262421;--daktilo-ribbon:#c84b31;--daktilo-rule:rgba(0,0,0,.2);--daktilo-pore:rgba(0,0,0,.035)}
.daktilo-theme-clean{--daktilo-paper:#fafafa;--daktilo-ink:#141414;--daktilo-ribbon:#1d4ed8;--daktilo-rule:rgba(0,0,0,.15);--daktilo-pore:rgba(0,0,0,.012)}
.daktilo-theme-carbon{--daktilo-paper:#18181b;--daktilo-ink:#e4e4e7;--daktilo-ribbon:#f59e0b;--daktilo-rule:rgba(255,255,255,.2);--daktilo-pore:rgba(255,255,255,.03);box-shadow:0 4px 24px rgba(0,0,0,.45)}
.daktilo-sheet h1,.daktilo-sheet h2,.daktilo-sheet h3{font-family:'Special Elite','Courier Prime',monospace;font-weight:400;border-bottom:2px dashed var(--daktilo-rule);padding-bottom:.4rem}
.daktilo-sheet a{color:var(--daktilo-ribbon);text-decoration:none;border-bottom:1px dashed var(--daktilo-ribbon)}
.daktilo-sheet ::selection{background:var(--daktilo-ribbon);color:var(--daktilo-paper)}
.daktilo-ink{position:relative}
.daktilo-overstrike{position:relative;opacity:.75;-webkit-user-select:none;user-select:none}
.daktilo-overstrike[data-strike]::after{content:attr(data-strike);position:absolute;left:0;top:-1px;color:var(--daktilo-ribbon);font-weight:700}
.daktilo-meta-header{display:flex;flex-wrap:wrap;gap:.5rem 1rem;justify-content:space-between;align-items:center;font-size:.8rem;border-bottom:1px solid var(--daktilo-rule);padding-bottom:.75rem;margin-bottom:2rem;text-transform:uppercase;letter-spacing:1px}
.daktilo-stamp-box{display:inline-block;border:2px solid var(--daktilo-ribbon);color:var(--daktilo-ribbon);padding:1px 6px;font-family:'Special Elite',monospace;font-weight:700;transform:rotate(-3deg)}
.daktilo-cursor{color:var(--daktilo-ribbon);animation:daktilo-blink 1s step-end infinite}
@keyframes daktilo-blink{50%{opacity:0}}
@media (prefers-reduced-motion:reduce){.daktilo-cursor{animation:none}}`;

/** Çekirdek stilleri (ve isteğe bağlı fontları) belgeye bir kez enjekte eder. */
export function injectStyles(fonts: boolean): void {
  const head = document.head;
  if (fonts && !document.getElementById(FONTS_ID)) {
    const link = document.createElement('link');
    link.id = FONTS_ID;
    link.rel = 'stylesheet';
    link.href = FONTS_URL;
    head.append(link);
  }
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    head.append(style);
  }
}
