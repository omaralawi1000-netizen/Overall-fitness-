// Claude Code Stop hook: blocks "done" while `npm run verify` fails (exit 2 sends the output back to Claude).
// Skips only when this exact code (HEAD + working tree) already passed, so committed failures are caught too.
// Never loops: if it already blocked once this turn, it lets Claude stop and explain.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8')); } catch { /* no input */ }
if (input.stop_hook_active) process.exit(0);

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 1 << 28 });
const gitDir = git('rev-parse', '--git-dir').trim();
const stamp = `${gitDir}/stop-check-ok`;
// The key covers HEAD, tracked changes and the CONTENT of untracked files (git diff leaves those out).
const h = createHash('sha1').update(git('rev-parse', 'HEAD') + git('status', '--porcelain') + git('diff', 'HEAD'));
for (const f of git('ls-files', '-o', '--exclude-standard', '-z').split('\0').filter(Boolean)) h.update(f).update(readFileSync(f));
const key = h.digest('hex');
if (existsSync(stamp) && readFileSync(stamp, 'utf8') === key) process.exit(0);

const r = spawnSync('npm', ['run', 'verify'], { encoding: 'utf8', shell: process.platform === 'win32' });
if (r.status !== 0) {
  console.error(`npm run verify fails. Fix it before saying done.\n${(r.stdout + r.stderr).slice(-3000)}`);
  process.exit(2);
}
writeFileSync(stamp, key);
