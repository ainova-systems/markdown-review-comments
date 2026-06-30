# AGENTS.md

Guidance for AI coding agents (and humans) working in this repo.

## What this is

**Markdown Review Notes** (`markdown-review-notes`) is a VS Code extension that adds
GitHub-style inline review comments to Markdown files. Local-first and git-native: the
markdown file is the single source of truth — each note is a `## COMMENT-...` block in a
`# Unresolved Comments` section, linked to its line by an inline `<!-- review-note: ID -->`
anchor that moves with the text. No PR, no SaaS, no database, and zero runtime dependencies
(devDeps only: typescript, @types/node, @types/vscode). `docs/PRD.md` is the FR-N behaviour spec.

## Build & test

- `npm install` — install dev dependencies.
- `npm run compile` — typecheck and emit to `out/` (`tsc -p ./`). This is the correctness gate.
- `npm run watch` — recompile on change.
- `npm test` — run the unit suite (`node --test` over `out/test/**/*.test.js`); `pretest`
  compiles first.
- Run/debug: open the folder in VS Code and press **F5** (Extension Development Host).

## Architecture (`src/`)

- `extension.ts` — activation entry point; constructs the services + providers and registers
  every `markdownReviewNotes.*` command.
- `providers/`
  - `ReviewCodeActionProvider.ts` — lightbulb / Ctrl+. quick-fixes (add, resolve, go to source).
  - `ReviewCommentController.ts` — the native Comments-API editing surface (gutter `+`, inline
    input threads, resolve), debounced against document changes.
- `services/`
  - `MarkdownService.ts` — **pure** string engine: find/create the section, generate ids, format
    and parse comment blocks, insert anchors, append/remove blocks. No `vscode` import.
  - `CommentService.ts` — orchestrates persistence on top of `MarkdownService`, applying changes
    to a `vscode.TextDocument` via `WorkspaceEdit`.
  - `NavigationService.ts` — `CodeLensProvider` exposing "Go to source" / "Resolve" / "Go to
    comment" lenses and their commands.
- `models/ReviewComment.ts` — the `ReviewComment` domain type (in-memory projection of a block).
- `test/` — `node:test` unit tests for the pure engine.

## Key invariant

`services/MarkdownService.ts` MUST stay free of any `vscode` dependency. It is the testable core
of the extension — all parsing, id generation, and markdown formatting lives here and is covered
by `test/markdownService.test.ts`. Anything that touches the editor, configuration, or the
Comments API belongs in `CommentService` / `NavigationService` / the providers, never in
`MarkdownService`. New engine logic ships with a unit test.

## Commit convention

One line, capitalized, past tense, no prefixes (no `feat:` / `fix:`). No `Co-authored-by` or
`Signed-off-by` trailers.
