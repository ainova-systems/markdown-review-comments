---
paths:
  - "src/**"
description: "Markdown engine invariants: vscode-free core, format compatibility, PRD traceability"
---

# Markdown engine invariants

## The engine stays free of `vscode`

`services/MarkdownService.ts` imports nothing from `vscode`. It is the testable core — id
generation, parsing, formatting, and section and anchor handling all live there, covered by
`test/markdownService.test.ts`. Anything touching the editor, configuration or the Comments
API belongs in `CommentService`, `NavigationService` or `providers/`. New engine behaviour
ships with a unit test in the same change.

## The on-disk format is a compatibility surface

Files written by an older version must keep parsing — that is why a `Line:` field is still
read but never written. Changing the anchor shape or the comment schema means updating the
engine, its unit tests, and the README's format section together.

## Keep the PRD traceable

`docs/prd.md` numbers the behaviour contract `FR-1`…`FR-10`, and source headers cite those
ids. Keep a citation accurate when the behaviour it names moves, and update `docs/prd.md` in
the same change rather than letting the two disagree. The ids are stable — do not renumber.
