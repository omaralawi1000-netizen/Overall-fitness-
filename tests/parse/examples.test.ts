// docs/parser-examples.md is checked here: every row must read exactly as the page says.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { understand, show } from '../../src/engine/parse';

const rows = readFileSync(new URL('../../docs/parser-examples.md', import.meta.url), 'utf8')
  .split('\n')
  .map((l) => l.match(/^\| `(.+)` \| (open|none) \| (.+) \|$/))
  .filter((m): m is RegExpMatchArray => !!m);

describe('docs/parser-examples.md', () => {
  it('has the examples', () => expect(rows.length).toBeGreaterThan(40));
  for (const [, phrase, wo, reading] of rows) {
    it(`${phrase} (${wo})`, () => expect(show(understand(phrase, { workoutOpen: wo === 'open' })).replace(/\|/g, '/')).toBe(reading));
  }
});
