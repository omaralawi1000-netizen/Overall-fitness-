// The real set parser, bundled for this page so the prototype reads phrases exactly as the app does.
// Rebuild: npx rolldown site/_prototypes/one/parser.entry.ts --format iife --name A2 --minify -o site/_prototypes/one/set-parser.js
export { parseSetCommand, guardSet, fixMisheard } from '../../../src/engine/parse/set';
export { mergeNumberWords, mergeDecimals } from '../../../src/engine/parse/words';
