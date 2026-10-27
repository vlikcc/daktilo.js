import { act, createElement, StrictMode, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DaktiloSheet, useDaktilo } from '../src/react';
import type { Daktilo } from '../src';
import { setReducedMotion } from './helpers';

// Bu dosya hem React 19 (varsayılan) hem React 18 (vitest.react18.config.ts) ile çalışır.
beforeEach(() => setReducedMotion(false));
afterEach(() => vi.restoreAllMocks());

const fakeSound = () => ({ playKeyClick: vi.fn(), playCarriageDing: vi.fn(), dispose: vi.fn(), setVolume: vi.fn() });

describe('daktilo-js/react', () => {
  let container: HTMLElement;
  let root: Root;
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    document.body.innerHTML = '<div id="root"></div>';
    container = document.getElementById('root')!;
    root = createRoot(container);
  });
  afterEach(() => act(() => root.unmount()));

  it('DaktiloSheet içeriği kağıda çevirir; unmount sonrası iz bırakmaz', async () => {
    let instance: Daktilo | null = null;
    await act(async () =>
      root.render(
        createElement(
          StrictMode,
          null,
          createElement(
            DaktiloSheet,
            { paper: 'clean', inkWear: 1, className: 'yazi', onReady: (d: Daktilo) => (instance = d) },
            createElement('p', null, 'Merhaba'),
          ),
        ),
      ),
    );
    const sheet = container.querySelector('article')!;
    expect(sheet.classList).toContain('yazi');
    expect(sheet.classList).toContain('daktilo-theme-clean');
    expect(sheet.querySelectorAll('.daktilo-ink').length).toBeGreaterThan(0);
    expect(instance).not.toBeNull();
  });

  it('resetKey değişince kağıdı yeni içerikle yeniden oluşturur', async () => {
    const render = (key: number, text: string) =>
      act(async () =>
        root.render(createElement(DaktiloSheet, { resetKey: key, inkWear: 0 }, createElement('p', null, text))),
      );
    await render(1, 'Bir');
    await render(1, 'Yok sayılır');
    expect(container.textContent).toBe('Bir');
    await render(2, 'İki');
    expect(container.textContent).toBe('İki');
    expect(container.querySelector('article')!.classList).toContain('daktilo-sheet');
  });

  it('useDaktilo en güncel callback’i çağırır ve sound fabrikası her başlatmada yeni motor üretir', async () => {
    vi.useFakeTimers();
    const factory = vi.fn(fakeSound);
    const calls: string[] = [];
    function Paper({ label }: { label: string }) {
      const { ref } = useDaktilo<HTMLDivElement>({
        animate: true,
        typoRate: 0,
        inkWear: 0,
        sound: factory,
        onComplete: () => calls.push(label),
      });
      return createElement('div', { ref }, createElement('p', null, 'ab'));
    }
    await act(async () => root.render(createElement(StrictMode, null, createElement(Paper, { label: 'ilk' }))));
    await act(async () => root.render(createElement(StrictMode, null, createElement(Paper, { label: 'son' }))));
    await act(async () => vi.runAllTimersAsync());
    vi.useRealTimers();
    expect(factory.mock.calls.length).toBe(2);
    expect(calls).toEqual(['son']);
  });

  it('className değişince Daktilo sınıflarını korur', async () => {
    let setClass: (value: string) => void = () => undefined;
    function Page() {
      const [className, set] = useState('a');
      setClass = set;
      return createElement(DaktiloSheet, { className, paper: 'carbon', inkWear: 0 }, createElement('p', null, 'x'));
    }
    await act(async () => root.render(createElement(Page)));
    await act(async () => setClass('b'));
    const sheet = container.querySelector('article')!;
    expect(sheet.classList).toContain('b');
    expect(sheet.classList).not.toContain('a');
    expect(sheet.classList).toContain('daktilo-sheet');
    expect(sheet.classList).toContain('daktilo-theme-carbon');
  });
});
