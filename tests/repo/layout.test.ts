import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The filing check (free, runs in `npm run verify` and in the deploy). Rules are in CLAUDE.md "Filing".
// A failure here means: file the new thing in an allowed place and add it to docs/README.md in the same change.
const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean).filter((f) => existsSync(f));
const map = readFileSync('docs/README.md', 'utf8');

const TOP = new Set(['.claude', '.github', '.gitignore', 'CLAUDE.md', 'README.md', 'docs', 'exam', 'knip.json', 'package-lock.json',
  'package.json', 'site', 'skills-lock.json', 'src', 'tests', 'tools', 'tsconfig.json', 'vite.config.ts']);
const IMAGE = /\.(jpe?g|png|webp)$/i;

describe('repo layout', () => {
  it('keeps every file in an allowed top-level place', () => {
    const stray = files.filter((f) => !TOP.has(f.split('/')[0]));
    expect(stray, 'new top-level files go in docs/, tools/, src/, tests/, exam/ or site/').toEqual([]);
  });

  it('keeps clips, archives and huge files out of git', () => {
    const bad = files.filter((f) => /\.(mp4|mov|webm|zip|psd)$/i.test(f) || statSync(f).size > 2_000_000);
    expect(bad, 'videos, zips and files over 2 MB live in the shared folder, not in git').toEqual([]);
  });

  it('lists every doc in the map', () => {
    const missing = files
      .filter((f) => f.startsWith('docs/') && f !== 'docs/README.md' && !(f.startsWith('docs/inspiration/') && IMAGE.test(f)))
      .filter((f) => !map.includes(f) && !map.includes(f.split('/').pop()!));
    expect(missing, 'add these to docs/README.md').toEqual([]);
  });

  it('lists every page, tool and exam folder in the map', () => {
    const dirs = new Set<string>();
    for (const f of files) {
      const p = f.split('/');
      if (p[0] === 'site' && p[1] === '_prototypes' && p.length > 3) dirs.add(p[2]);
      else if (p[0] === 'site' && p.length > 2) dirs.add(p[1]);
      else if ((p[0] === 'tools' || p[0] === 'exam') && p.length > 2) dirs.add(`${p[0]}/${p[1]}`);
    }
    const missing = [...dirs].filter((d) => !map.includes(`${d.split('/').pop()}/`));
    expect(missing, 'add these to docs/README.md').toEqual([]);
  });

  it('has no dead paths in the map', () => {
    const paths = [...map.matchAll(/`([^`\s]+)`/g)].map((m) => m[1])
      .filter((p) => /^(docs|site|src|tests|exam|tools|\.claude|\.github)\//.test(p) && !/[*<>{}]/.test(p));
    const dead = paths.filter((p) => !existsSync(p));
    expect(dead, 'fix or remove these in docs/README.md').toEqual([]);
  });
});
