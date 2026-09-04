## Summary

<!-- One or two sentences: what this PR does and the problem it solves. -->

## Changes

<!-- Bullet list of the concrete changes. -->

-

## How tested

<!-- Steps a reviewer can run. For behaviour changes, include the F5 (Extension Development
     Host) steps and what to expect. -->

- [ ] `npm run verify` is green (strict compile + unit tests)
- [ ] Manually exercised the change via F5 (Extension Development Host)

## Checklist

- [ ] New engine behaviour is covered by a test in `src/test/markdownService.test.ts`
- [ ] `MarkdownService.ts` still has no `vscode` import
- [ ] Markdown-format changes keep older files parsing, and the README format section matches
- [ ] `CHANGELOG.md` has a line under `## [Unreleased]` if a user would notice this
- [ ] A file added to or removed from the VSIX is reflected in `.vscodeignore` **and**
      `scripts/check-package-contents.mjs`
- [ ] Commit message follows the convention (one line, capitalized, past tense, no prefixes)
