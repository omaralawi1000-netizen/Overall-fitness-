// The exam's own runs (judges and report). Never part of `npm run verify`: they spend money and need transcripts.
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { root: `${import.meta.dirname}/..`, include: ['exam/judge/*.test.ts', 'exam/v2/*.test.ts'], testTimeout: 24 * 3600_000 } });
