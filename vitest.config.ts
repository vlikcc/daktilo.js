import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Alt modüller (ör. daktilo-js/react) çekirdeği paket adıyla içe aktarır; testlerde kaynağa yönlenir.
    alias: { 'daktilo-js': fileURLToPath(new URL('./src/index.ts', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'html', 'lcov'],
    },
  },
});
