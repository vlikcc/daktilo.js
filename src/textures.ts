/**
 * Optional paper textures drawn with CSS gradients on a non-interactive overlay: no images, no
 * extra elements. Works on any Daktilo sheet (including the Web Component and Writer mode).
 */
export type Texture = 'stain' | 'fold' | 'holes' | 'aged';

export const TEXTURES: readonly Texture[] = ['stain', 'fold', 'holes', 'aged'];

const STYLE_ID = 'daktilo-textures-css';

// Her doku kendi CSS değişkenini doldurur; ::after katmanı hepsini tek background-image listesinde birleştirir.
export const TEXTURES_CSS = `.daktilo-textured::after{content:'';position:absolute;inset:0;pointer-events:none;mix-blend-mode:multiply;background-image:var(--daktilo-stain,none),var(--daktilo-fold,none),var(--daktilo-holes,none),var(--daktilo-aged,none)}
.daktilo-texture-stain{--daktilo-stain:radial-gradient(circle at 84% 14%,#0000 40px,#7a4a1430 42px,#7a4a1414 47px,#0000 50px),radial-gradient(circle at 84% 14%,#7a4a140a 38px,#0000 41px)}
.daktilo-texture-fold{--daktilo-fold:linear-gradient(#0000 33.1%,#0000000f 33.3%,#ffffff40 33.5%,#0000 33.9%,#0000 66.4%,#0000000f 66.6%,#ffffff40 66.8%,#0000 67.2%)}
.daktilo-texture-holes{--daktilo-holes:radial-gradient(circle at 16px 12%,#0000004d 6px,#00000014 7px,#0000 8px),radial-gradient(circle at 16px 50%,#0000004d 6px,#00000014 7px,#0000 8px),radial-gradient(circle at 16px 88%,#0000004d 6px,#00000014 7px,#0000 8px)}
.daktilo-texture-aged{--daktilo-aged:radial-gradient(ellipse at center,#0000 55%,#8a641e26 100%)}
@media print{.daktilo-textured::after{display:none}}`;

/**
 * Adds paper textures to a sheet: a coffee `stain`, `fold` creases, punched `holes` and `aged`
 * edges. Returns a function that removes them again.
 *
 * ```ts
 * const remove = applyTextures(document.querySelector('#essay')!, ['stain', 'fold']);
 * ```
 */
export function applyTextures(target: HTMLElement, textures: readonly Texture[]): () => void {
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = TEXTURES_CSS;
    document.head.append(style);
  }
  const classes = [
    'daktilo-textured',
    ...textures.filter((t) => TEXTURES.includes(t)).map((t) => `daktilo-texture-${t}`),
  ];
  const added = classes.filter((name) => !target.classList.contains(name));
  target.classList.add(...added);
  return () => target.classList.remove(...added);
}
