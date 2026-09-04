# Product spec — Markdown Review Comments

The behaviour contract for the extension. Source files cite the `FR-N` ids below, so keep
them stable: renumbering breaks the traceability, and changing what one of them means is a
change to the shipped format.

This document describes what the extension **does**, not what it was once planned to do.
When behaviour and this file disagree, one of them is a bug — say which in the PR.

## Problem

Reviewing a Markdown document — an ADR, a spec, an agent instruction file — has no good home
in an editor. A pull request is too heavy and too late for a document still being drafted.
Sidecar review files are invisible in `git diff` and go stale when the text moves. Preview
based tools review a rendering rather than the file, and keep the notes in their own storage.

Meanwhile the document is increasingly read by an AI agent, which sees the raw file and
nothing else.

## Solution

Notes live in the Markdown file itself:

- an appendix section, `# Unresolved Comments`, holds the notes as ordinary Markdown blocks;
- an HTML-comment anchor, `<!-- review-note: ID -->`, sits above the reviewed line and ties
  the two together;
- resolving a note deletes both, leaving a clean document.

The file renders normally in any Markdown viewer, the review shows up in `git diff`, and any
reader — human or agent — can follow it with no tooling at all.

## Users

Senior engineers, architects and technical writers working in Markdown-heavy repositories:
specs, ADRs, architecture docs, agent instruction files. Typically in VS Code or Cursor,
often alongside Claude Code, Copilot or Codex.

## Principles

1. Markdown is the source of truth.
2. Git is the persistence layer — no database, no sync, no account.
3. AI readability beats machine optimisation.
4. Low friction beats feature richness.
5. No proprietary storage, no network.

## Functional requirements

### FR-1 — Markdown only

The extension activates on `onLanguage:markdown` and acts only on documents whose
`languageId` is `markdown`, under the `file` and `untitled` schemes. Commands invoked
elsewhere warn and do nothing.

### FR-2 — Code action integration

A `CodeActionProvider` offers the review actions through the lightbulb, `Ctrl+.`, the editor
context menu and the Command Palette. The add action is also bound to `Ctrl+Alt+M`
(`Cmd+Alt+M` on macOS).

### FR-3 — Add a comment

`markdownReviewComments.addComment` opens the native inline input at the selection. On
submit, the extension captures the selected text (or the whole line when the selection is
empty), generates an id, writes the anchor and appends the comment block. An empty body is
not persisted.

### FR-4 — Section management

The `# Unresolved Comments` section is created on first use — preceded by a `---` separator
— and reused afterwards. Its title is configurable
(`markdownReviewComments.unresolvedSectionTitle`). When the last comment is resolved the
empty section, and the separator before it, are removed
(`markdownReviewComments.removeEmptySection`).

### FR-5 — Comment ids

`COMMENT-YYYY-MM-DD-NNN`, where the date is UTC and `NNN` is a per-day sequence starting at
`001`, derived by scanning the ids already present in the document. Ids are therefore
deterministic, human-readable, and stable under concurrent edits to unrelated files.

### FR-6 — Comment schema

Each block records the id, the creation timestamp, the status, the reviewed text and the
body:

```md
## COMMENT-2026-09-04-001

Created: 2026-09-04T14:32:11Z
Status: unresolved

Selected Text:
> Decouple the Agent Skills directory entirely from adapters.

Comment:
Who owns the sync here — sync.sh, or the target adapters?
```

**No line number is stored.** A `Line: N` field is wrong as soon as anything is inserted
above it, including a second comment higher in the same file. The anchor is the link
instead, because it moves with the content it marks. Blocks written by version 0.1 that
still carry a `Line:` field are parsed without complaint; nothing writes one.

### FR-7 — AI-friendly output

The stored form is plain Markdown: no JSON, no encoding, no metadata that must be read with
a tool. An agent handed the file sees the review as part of the document.

`Export Review Context` additionally renders all unresolved notes of the current file into a
new document shaped for an LLM prompt — each note with its anchor, reviewed text and body,
plus the instruction to fix the source and delete the block.

### FR-8 — Resolve

Resolving removes the comment block and, by default
(`markdownReviewComments.removeMarkerOnResolve`), its anchor. There is no resolved-comment
archive: the record of the exchange is the git history. Resolve is reachable from the inline
thread, the CodeLens, the lightbulb and the Command Palette; without an explicit id it acts
on the block under the cursor, else it offers a picker.

### FR-9 — Navigation

A `CodeLensProvider` puts **Go to source** and **Resolve** above each comment block, and
**Go to comment** on each anchored line
(`markdownReviewComments.enableCodeLens`). Navigation resolves the anchor first and falls
back to searching for the recorded selected text when no anchor is present.

### FR-10 — Inline threads

Saved comments render as native Comments-API threads anchored below their source line
(`markdownReviewComments.showInlineComments`), refreshed — debounced — as the document
changes.

## Non-functional requirements

- **No dependencies, no network.** The VSIX ships only this project's compiled output.
- **Trust-agnostic.** Supported in untrusted workspaces and on virtual file systems, because
  the extension only reads and writes text documents.
- **Fast.** Activation is lazy (first Markdown document). No AST parse, no background
  indexing, no workspace scan; edits are regex-and-slice operations on the open document.
- **Line-ending preserving.** A CRLF document stays CRLF.

## Non-goals

Not a GitHub review replacement, a collaborative SaaS, a live multi-user tool, an issue
tracker, a Markdown CMS, or a WYSIWYG editor. No threading, no avatars, no syncing, no
webview UI.

## Possible future work

Deliberately unbuilt, listed so that "why not X" has an answer:

- **Cross-file review** — collecting the unresolved notes of a whole folder into one view.
  Wanted, but it needs a workspace index, which conflicts with the no-background-work rule
  until there is evidence people need it.
- **Ask an agent to resolve** — a command that hands the export to a configured agent. Held
  back because it would introduce the first external dependency and the first network call.
- **Gutter decorations** for anchored lines, if the inline threads turn out not to be enough
  of a signal.
