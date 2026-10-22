// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Daktilo, MechanicalSoundEngine } from '../src';

describe('SSR (DOM olmayan ortam)', () => {
  it('modül içe aktarılabilir ve örnek oluşturmak hata vermez', async () => {
    const d = new Daktilo('#essay', { animate: true, sound: true });
    expect(d.elements).toEqual([]);
    await expect(d.finished).resolves.toBeUndefined();
    expect(() => d.skip()).not.toThrow();
    expect(() => d.destroy()).not.toThrow();
  });

  it('ses motoru DOM olmadan da sessizce çalışır', () => {
    const engine = new MechanicalSoundEngine(true);
    expect(() => {
      engine.playKeyClick();
      engine.dispose();
    }).not.toThrow();
  });
});
