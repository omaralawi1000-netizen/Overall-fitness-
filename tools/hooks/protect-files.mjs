// Claude Code PreToolUse hook: blocks edits to the files that define "green" so a check can't be weakened to pass.
// To change one of these on purpose, Omar says yes in the chat and edits it by hand or lifts this hook.
// package.json is allowed (dependency updates) except for the `verify` and `knip` scripts.
import { readFileSync } from 'node:fs';

const PROTECTED = [/(^|\/)tsconfig\.json$/, /(^|\/)vite\.config\.ts$/, /(^|\/)knip\.json$/, /(^|\/)exam\/vitest\.config\.ts$/,
  /(^|\/)\.github\/workflows\//, /(^|\/)tests\/repo\/layout\.test\.ts$/, /(^|\/)tools\/hooks\//, /(^|\/)\.claude\/settings\.json$/];
const GUARDED_SCRIPTS = ['verify', 'knip'];

function block(path) {
  console.error(`Blocked: ${path} defines the checks. Ask Omar before changing it.`);
  process.exit(2);
}

function scriptsOf(text) {
  try { const s = JSON.parse(text).scripts ?? {}; return GUARDED_SCRIPTS.map((k) => s[k]); } catch { return null; }
}

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8')); } catch { process.exit(0); }
const ti = input.tool_input ?? {};
const path = String(ti.file_path ?? '').replaceAll('\\', '/');
if (PROTECTED.some((re) => re.test(path))) block(path);

if (/(^|\/)package\.json$/.test(path)) {
  const touched = (s) => typeof s === 'string' && GUARDED_SCRIPTS.some((k) => s.includes(`"${k}"`));
  const edits = Array.isArray(ti.edits) ? ti.edits : [ti];
  if (edits.some((e) => touched(e.old_string) || touched(e.new_string))) block(path);
  if (typeof ti.content === 'string') {
    // A full rewrite: the guarded scripts must come out exactly as they are now (or unreadable = blocked).
    let now = null;
    try { now = scriptsOf(readFileSync(path, 'utf8')); } catch { /* new file */ }
    const next = scriptsOf(ti.content);
    if (!next || (now && JSON.stringify(now) !== JSON.stringify(next))) block(path);
  }
}
