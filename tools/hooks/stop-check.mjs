// Claude Code Stop hook: blocks "done" while `npm run verify` fails (exit 2 sends the output back to Claude).
// Skips when nothing changed, and never loops: if it already blocked once this turn, it lets Claude stop and explain.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8')); } catch { /* no input */ }
if (input.stop_hook_active) process.exit(0);

const changed = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim();
if (!changed) process.exit(0);

const r = spawnSync('npm', ['run', 'verify'], { encoding: 'utf8', shell: process.platform === 'win32' });
if (r.status !== 0) {
  console.error(`npm run verify fails. Fix it before saying done.\n${(r.stdout + r.stderr).slice(-3000)}`);
  process.exit(2);
}
