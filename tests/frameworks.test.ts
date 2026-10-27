import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, h, nextTick, ref, withDirectives } from 'vue';
import { daktilo } from '../src/svelte';
import { applyTextures, TEXTURES_CSS } from '../src/textures';
import { DaktiloSheet, vDaktilo } from '../src/vue';
import type { Daktilo } from '../src';
import { setReducedMotion } from './helpers';

beforeEach(() => {
  setReducedMotion(false);
  document.body.innerHTML = '<div id="app"></div>';
});
afterEach(() => vi.useRealTimers());

describe('daktilo-js/textures', () => {
  it('doku sınıflarını ekler, CSS’i bir kez enjekte eder ve geri alır', () => {
    const el = document.createElement('article');
    el.className = 'mine';
    const remove = applyTextures(el, ['stain', 'holes', 'bogus' as never]);
    expect([...el.classList]).toEqual(['mine', 'daktilo-textured', 'daktilo-texture-stain', 'daktilo-texture-holes']);
    applyTextures(document.createElement('div'), ['fold']);
    expect(document.querySelectorAll('#daktilo-textures-css')).toHaveLength(1);
    remove();
    expect(el.className).toBe('mine');
  });

  it('yazdırırken dokuları gizler', () => {
    expect(TEXTURES_CSS).toContain('@media print{.daktilo-textured::after{display:none}}');
  });
});

describe('daktilo-js/svelte', () => {
  it('use:daktilo eylemi başlatır, seçenek değişince yeniden başlatır ve geri yükler', () => {
    const node = document.createElement('article');
    node.innerHTML = '<p>Metin</p>';
    let ready: Daktilo | null = null;
    const action = daktilo(node, { paper: 'clean', inkWear: 0, onReady: (d) => (ready = d) });
    expect(node.classList).toContain('daktilo-theme-clean');
    expect(ready).not.toBeNull();

    action.update({ paper: 'carbon', inkWear: 0 });
    expect(node.classList).toContain('daktilo-theme-carbon');
    expect(node.classList).not.toContain('daktilo-theme-clean');

    action.destroy();
    expect(node.getAttribute('class')).toBeNull();
    expect(node.innerHTML).toBe('<p>Metin</p>');
  });
});

describe('daktilo-js/vue', () => {
  it('<DaktiloSheet> prop’ları seçenek olarak uygular, olayları yayar ve unmount’ta iz bırakmaz', async () => {
    vi.useFakeTimers();
    const events: string[] = [];
    let instance: Daktilo | null = null;
    const app = createApp({
      render: () =>
        h(
          DaktiloSheet,
          {
            paper: 'carbon',
            animate: true,
            inkWear: 0,
            typoRate: 0,
            class: 'yazi',
            onReady: (d: Daktilo) => (instance = d),
            onChar: (c: string) => events.push(c),
            onComplete: () => events.push('✓'),
          },
          () => [h('p', 'ab')],
        ),
    });
    app.mount('#app');
    const sheet = document.querySelector('article')!;
    expect(sheet.classList).toContain('yazi');
    expect(sheet.classList).toContain('daktilo-theme-carbon');
    await vi.runAllTimersAsync();
    await instance!.finished;
    await Promise.resolve();
    expect(events.join('')).toBe('ab✓');
    // Belirtilmeyen Boolean prop'lar (ör. respectReducedMotion) çekirdeğin varsayılanına bırakılır.
    expect(instance!.options.respectReducedMotion).toBe(true);

    app.unmount();
  });

  it('class değişince Daktilo sınıflarını korur, resetKey değişince içeriği yeniden oluşturur', async () => {
    const cls = ref('a');
    const key = ref(1);
    const text = ref('Bir');
    createApp({
      render: () => h(DaktiloSheet, { class: cls.value, resetKey: key.value, inkWear: 0 }, () => [h('p', text.value)]),
    }).mount('#app');
    const sheet = () => document.querySelector('article')!;

    cls.value = 'b';
    text.value = 'Yok sayılır';
    await nextTick();
    expect(sheet().classList).toContain('b');
    expect(sheet().classList).toContain('daktilo-sheet');
    expect(sheet().textContent).toBe('Bir');

    key.value = 2;
    await nextTick();
    await nextTick();
    expect(sheet().textContent).toBe('Yok sayılır');
    expect(sheet().classList).toContain('daktilo-sheet');
  });

  it('v-daktilo yönergesi elemanı kağıda çevirir ve kaldırılınca geri yükler', async () => {
    const show = ref(true);
    createApp({
      render: () =>
        show.value ? withDirectives(h('section', [h('p', 'x')]), [[vDaktilo, { paper: 'clean', inkWear: 0 }]]) : null,
    }).mount('#app');
    const section = document.querySelector('section')!;
    expect(section.classList).toContain('daktilo-theme-clean');
    show.value = false;
    await nextTick();
    expect(section.getAttribute('class')).toBeNull();
  });
});
