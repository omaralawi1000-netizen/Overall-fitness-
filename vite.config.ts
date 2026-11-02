import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// The engine's debug page builds into dist/engine/. The deploy workflow then copies site/ on top of dist/ as before,
// so the design pages at / are unchanged and the debug page lives at /engine/.
export default defineConfig({
  root: resolve(import.meta.dirname, 'src/debug'),
  base: './',
  build: { outDir: resolve(import.meta.dirname, 'dist/engine'), emptyOutDir: true },
  test: { root: import.meta.dirname, include: ['tests/**/*.test.ts'] },
});
