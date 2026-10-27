// Fixture sayfasının (e2e/fixture.html) testlerde kullanılan global'leri.
declare global {
  interface Window {
    Daktilo: typeof import('../src');
    calls: { key: number; ding: number; chars: number; lines: number };
    countingSound: () => unknown;
    start: (html: string, options?: Record<string, unknown>) => Promise<void>;
    daktilo: { skip(): void; pause(): void; resume(): void };
    DaktiloEditor: { DaktiloWriter: new (target: string, options?: Record<string, unknown>) => unknown };
  }
}

export {};
