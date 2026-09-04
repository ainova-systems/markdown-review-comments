# Contributing

Thanks for helping improve Markdown Review Comments. The codebase is small (~1,400 lines of
TypeScript, no runtime dependencies) and the workflow is short — please read this before
opening a PR.

## Prerequisites

- Node.js 20 or newer (on Windows, 22 or newer: the test script relies on the runner's own
  glob expansion, which `cmd.exe` does not provide and Node 20 does not implement)
- VS Code 1.85 or newer

## Build and check

```bash
npm install
npm run compile   # one-off build (strict tsc) to out/
npm run watch     # incremental rebuild on change
npm test          # unit tests (node:test over out/test/**/*.test.js)
npm run verify    # the gate: compile + test
```

**The correctness gate is `npm run verify` green.** There is no bundler and no
type-checking shortcut — `tsc` *is* the build, so a clean strict compile plus passing tests
is the whole bar. CI enforces it on Node 20 and 22 for every push and PR to `main`, then
packages the VSIX and asserts its exact contents.

Run and debug with <kbd>F5</kbd> (Extension Development Host). It opens the bundled
`examples/` folder, so you can exercise the commands against `examples/sample-review.md`;
the default build task (`npm: watch`) runs first, so edits in `src/` are picked up on the
next reload.

## Where logic goes

The parsing and formatting engine lives in `src/services/MarkdownService.ts` and has **no
`vscode` dependency** — that is what makes it unit-testable in plain Node. Keep all pure
Markdown logic there (id generation, parse, insert, remove, section management) and cover
new behaviour with a test in `src/test/markdownService.test.ts`. The `vscode`-facing layers
(`extension.ts`, `providers/`, the orchestration in `services/CommentService.ts` and
`services/NavigationService.ts`) stay thin and are verified by the F5 run.

## Pull requests

- Any change to the Markdown format — the anchor shape, the comment schema, section
  handling — updates `MarkdownService.ts` and its unit tests in the same PR, and keeps the
  README's format section in sync. That format is a compatibility surface: files written by
  an older version must keep parsing.
- Add a line under `## [Unreleased]` in `CHANGELOG.md` for anything a user would notice.
- Keep changes focused, and match the strict `tsconfig` (`noUnusedLocals`,
  `noUnusedParameters`, `noImplicitReturns`).

## Commit messages

One line, capitalized, past tense, no prefix and no trailers:

- ✅ `Removed the stored line number from the comment schema`
- ❌ `feat: remove line number`, `fix(parser): ...`
- No `Co-authored-by:` or `Signed-off-by:` trailers.

## Visual assets

The Marketplace icon and the README diagrams are generated, never hand-edited:

```bash
npm run media
```

This renders `docs/media/src/*.svg` to `images/icon.png` and `docs/media/*.png` using
`sharp-cli`, fetched on demand through `npx`. The icon SVG is hand-authored; the diagrams
are generated from the definitions in `scripts/render-media.mjs`, so change the script — not
the SVG — to alter a diagram. Commit the regenerated PNGs: the Marketplace renders the
README straight from the repository, and neither CI nor a release may depend on a
rasteriser.

## Releasing

Maintainers only, and documented separately in [docs/releasing.md](docs/releasing.md).

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).
