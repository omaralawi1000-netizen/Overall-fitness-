// Messy, voice-to-text style phrases (see dictation.corpus.ts). Each row is one test; the hit rate is passes / rows.
import { describe, it, expect } from 'vitest';
import { understand } from '../../src/engine/parse';
import { judge } from './judge';
import { CORPUS } from './dictation.corpus';

describe(`messy dictation (${CORPUS.length} phrases)`, () => {
  for (const row of CORPUS) {
    it(`${row.open ? '[workout] ' : ''}${row.say}`, () => {
      expect(judge(understand(row.say, { workoutOpen: !!row.open }), row.expect)).toBe('');
    });
  }
});
