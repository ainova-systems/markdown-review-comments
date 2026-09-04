---
description: "Markdown Review Comments — what the extension is, how it is built, and the packaging invariant"
---

# Markdown Review Comments

VS Code extension (`ainova-systems.markdown-review-comments`) that adds GitHub-style inline
review comments to Markdown files. Local-first and git-native: the Markdown file is the
single source of truth. A note is a `## COMMENT-…` block in a `# Unresolved Comments`
section, tied to its line by an inline `<!-- review-note: ID -->` anchor that moves with the
text. No network calls and no runtime dependencies — devDependencies only.

## Stack and layout

Strict `tsc` is the build; there is no bundler, so a clean compile plus the unit suite is the
whole bar. CommonJS output to `out/`, VS Code API `^1.85`, `node:test` for the tests, which
CI runs on Node 20 and 22. Roughly 1,400 lines in `src/`:

- `extension.ts` — activation; registers every `markdownReviewComments.*` command.
- `providers/` — `ReviewCodeActionProvider.ts` (lightbulb) and `ReviewCommentController.ts`
  (Comments API: gutter `+`, inline threads, resolve).
- `services/` — `MarkdownService.ts` (pure engine), `CommentService.ts` (persistence through
  `WorkspaceEdit`), `NavigationService.ts` (CodeLens).
- `models/ReviewComment.ts`, `test/markdownService.test.ts`.

Iterate with `npm run watch` and F5, which opens the bundled `examples/` folder in the
Extension Development Host.

## The VSIX ships an exact file list

`vsce` ignores `.gitignore` once a `.vscodeignore` exists, so a new directory reaches every
user unless `.vscodeignore` excludes it. `scripts/check-package-contents.mjs` asserts the
exact packaged list and fails the build otherwise, so adding or removing a shipped file is a
deliberate edit of both. Prove a packaging change with the packager itself (`npx vsce ls`),
never by reading Git status.

## Where the rest is written down

`docs/prd.md` is the behaviour contract, `docs/releasing.md` the release runbook, and
`CONTRIBUTING.md` the contributor workflow. The release pipeline refuses to publish unless
the tag, `package.json` and `CHANGELOG.md` name the same version; Marketplace versions are
write-once, so a burned number is never reused.
