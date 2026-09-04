#!/usr/bin/env node
/**
 * Asserts that the VSIX ships exactly the expected files — no more, no less.
 *
 *   node scripts/check-package-contents.mjs
 *
 * `vsce` ignores `.gitignore` whenever a `.vscodeignore` exists, so a new
 * directory added to the repository ships to every user unless `.vscodeignore`
 * lists it. This check turns that silent leak into a failing build. When a file
 * is added on purpose, add it to EXPECTED below in the same change.
 */
import { spawnSync } from 'node:child_process';

const EXPECTED = [
  'CHANGELOG.md',
  'LICENSE',
  'README.md',
  'images/icon.png',
  'out/extension.js',
  'out/models/ReviewComment.js',
  'out/providers/ReviewCodeActionProvider.js',
  'out/providers/ReviewCommentController.js',
  'out/services/CommentService.js',
  'out/services/MarkdownService.js',
  'out/services/NavigationService.js',
  'package.json',
];

const result = spawnSync('npx vsce ls', { encoding: 'utf8', shell: true });
if (result.status !== 0) {
  console.error(result.stderr || 'vsce ls failed');
  process.exit(1);
}

// `vsce ls` prints the prepublish script's output first. Every packaged path is
// a single whitespace-free token; the noise around it is prose or npm's `>` and
// node's `(node:...)` prefixes.
const actual = result.stdout
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !/\s/.test(line) && !/^[>(]/.test(line))
  .sort();

const expected = [...EXPECTED].sort();
const unexpected = actual.filter((file) => !expected.includes(file));
const missing = expected.filter((file) => !actual.includes(file));

if (unexpected.length > 0 || missing.length > 0) {
  if (unexpected.length > 0) {
    console.error('Unexpected files in the VSIX (add them to .vscodeignore):');
    for (const file of unexpected) {
      console.error(`  + ${file}`);
    }
  }
  if (missing.length > 0) {
    console.error('Files missing from the VSIX:');
    for (const file of missing) {
      console.error(`  - ${file}`);
    }
  }
  process.exit(1);
}

console.log(`VSIX contents verified: ${actual.length} files, exactly as expected.`);
