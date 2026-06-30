# Contributing

Thanks for helping improve Markdown Review Notes. The codebase is small (~1,400 LOC
of TypeScript, zero runtime dependencies) and the workflow is simple — please read
this before opening a PR.

## Prerequisites

- Node.js 20+
- VS Code 1.85+

## Build & check

- `npm install` — dependencies (dev only: `typescript`, `@types/node`, `@types/vscode`).
- `npm run compile` — one-off build (`tsc -p ./`, strict) to `out/`.
- `npm run watch` — incremental rebuild on change.
- `npm test` — run the unit tests (`node:test` over `out/test/**/*.test.js`; the
  `pretest` step compiles first).

**The correctness gate is `npm run compile` clean (strict `tsc`) AND `npm test`
green.** There is no bundler and no type-checking shortcut — `tsc` is the build, so
a clean compile plus passing tests is the whole bar. CI enforces both on pushes and
pull requests targeting `main`.

Run/debug: open the folder in VS Code and press **F5** (Extension Development Host).
The host opens the bundled `examples/` folder so you can exercise commands against
`examples/sample-review.md`; the default build task (`npm: watch`) runs first, so
edits in `src/` are picked up on the next reload.

## Architecture & where logic goes

The parsing/formatting engine lives in `src/services/MarkdownService.ts` and has **no
`vscode` dependency** — that is what makes it unit-testable in plain Node. Keep all
pure markdown logic (id generation, parse, insert, remove, section management) there,
and cover new behaviour with a test in `src/test/markdownService.test.ts`. The
`vscode`-facing layers (`extension.ts`, `providers/`, the orchestration in
`services/CommentService.ts` / `NavigationService.ts`) stay thin and are verified by
the manual F5 run.

## Pull requests

- `docs/PRD.md` is authoritative for behaviour — cite the `FR-N` IDs (FR-1…FR-9) in
  code comments and commit messages for traceability.
- Any change to the markdown format (anchor shape, comment schema, section handling)
  must update both `MarkdownService.ts` and its unit tests in the same PR, and keep
  the README's "Comment schema" example in sync.
- Keep changes minimal and focused; match the existing code style and the strict
  `tsconfig` (`noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`).

## Commit messages

One line, capitalized, written in the past tense, with **no** prefix and **no**
trailers:

- ✅ `Removed the stored line number from the comment schema`
- ❌ `feat: remove line number` / `fix(parser): ...`
- No `Co-authored-by:` or `Signed-off-by:` trailers.
