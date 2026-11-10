import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// The real app (Window): built into dist/app/. The engine's debug page keeps its own config (vite.config.ts).
// base './' keeps every URL relative, so the app works at /app/ on Pages and at the root in dev.
export default defineConfig({
  root: resolve(import.meta.dirname, '../src/app'),
  base: './',
  build: { outDir: resolve(import.meta.dirname, '../dist/app'), emptyOutDir: true, target: 'chrome120' },
});
