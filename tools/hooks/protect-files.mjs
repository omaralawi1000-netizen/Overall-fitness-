// Claude Code PreToolUse hook: blocks edits to the files that define "green" so a check can't be weakened to pass.
// To change one of these on purpose, Omar says yes in the chat and edits it by hand or lifts this hook.
import { readFileSync } from 'node:fs';

const PROTECTED = [/(^|\/)tsconfig\.json$/, /(^|\/)vite\.config\.ts$/, /(^|\/)knip\.json$/, /(^|\/)exam\/vitest\.config\.ts$/,
  /(^|\/)\.github\/workflows\//, /(^|\/)tests\/repo\/layout\.test\.ts$/, /(^|\/)tools\/hooks\//, /(^|\/)\.claude\/settings\.json$/];

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8')); } catch { process.exit(0); }
const path = String(input.tool_input?.file_path ?? '').replaceAll('\\', '/');
if (PROTECTED.some((re) => re.test(path))) {
  console.error(`Blocked: ${path} defines the checks. Ask Omar before changing it.`);
  process.exit(2);
}
