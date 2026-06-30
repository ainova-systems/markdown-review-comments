# Markdown Review Notes

> GitHub-style inline review comments inside Markdown files — **local-first, git-native, AI-friendly**. No PR, no SaaS backend, no database.

Hover the gutter of any `*.md` file, click the **+**, and type a note **inline, right below the line** — just like a GitHub PR review. The note is saved into an `# Unresolved Comments` section at the bottom of the file and shown back as an inline thread. Comments live in the markdown itself, so they survive branches, AI refactors, and show up in `git diff`.

Built for AI-first repositories, architecture docs, ADRs, specs, and async design reviews in VSCode / Cursor / Claude Code workflows.

---

## Install

Not yet published to the VS Code Marketplace. Install from a `.vsix`:

```sh
npm install
npm run compile
npx @vscode/vsce package   # produces markdown-review-notes-<version>.vsix
code --install-extension markdown-review-notes-<version>.vsix
```

Or run it from source: open this folder in VS Code and press **F5** (Extension Development Host — it opens the bundled `examples/` folder).

---

## Features

- **GitHub-style inline commenting** — hover the gutter → **+** → type below the line. No menus, no top-of-window prompt. Also available from the lightbulb / `Ctrl+.` / command palette / `Ctrl+Alt+M`.
- **Inline comment threads** — saved comments are rendered as native threads anchored beneath the line they reference, each with a **Resolve** action.
- **Stable source anchors, no line numbers** — an inline `<!-- review-note: YYYY-MM-DD-XXX -->` anchor marks the source. It moves with the text, so the link never goes stale when content is added above it. (Older line-number fields are no longer written.)
- **Automatic section management** — the `# Unresolved Comments` section is created on first use and reused afterwards.
- **Deterministic, human-readable ids** — `COMMENT-YYYY-MM-DD-XXX` (per-day sequence); the id core matches the anchor.
- **Resolve = remove** — resolving a comment deletes its block and its anchor, leaving a clean file. (In an LLM workflow the agent can instead remove it itself after fixing the underlying issue.)
- **Navigation via CodeLens** — jump from a comment block in the section to its source line.
- **Export Review Context** — collect all unresolved comments into a fresh, LLM-prompt-friendly document.
- **AI-friendly output** — plain markdown, no JSON, no hidden metadata.

---

## Usage

### Add a comment

The fastest way (GitHub-style):

1. Open a Markdown file and **hover the gutter** (left of the line numbers) on the line you want to comment.
2. Click the **+** that appears — an input box opens **right below the line**.
3. Type your note and click **Add review note**.

Or from the keyboard / lightbulb: select a line or range, press `Ctrl+Alt+M` (or `Ctrl+.` → **Add Unresolved Comment**) to open the same inline input at the selection.

**Before**

```md
## Option B

Decouple the Agent Skills directory entirely from adapters.
```

**After**

```md
## Option B

<!-- review-note: 2026-05-24-001 -->
Decouple the Agent Skills directory entirely from adapters.
```

…and at the bottom of the file:

```md
---

# Unresolved Comments

## COMMENT-2026-05-24-001

Created: 2026-05-24T14:32:11Z
Status: unresolved

Selected Text:
> Decouple the Agent Skills directory entirely from adapters.

Comment:
Need to validate whether ownership belongs to sync.sh or target adapters.
```

### Resolve a comment

Click **Resolve** on the inline comment thread, or put the cursor inside a comment block and pick **Mark Comment Resolved** from the lightbulb / CodeLens, or run **Markdown Review Notes: Mark Comment Resolved** from the palette. The comment block and its inline anchor are removed.

### Navigate

Saved comments appear as inline threads beneath their source line. A **Go to source** / **Resolve** CodeLens also appears above each block in the `# Unresolved Comments` section.

### Export review context

Run **Markdown Review Notes: Export Review Context** to open a new document containing every unresolved comment, formatted for pasting into an LLM prompt.

---

## Commands

| Command | Title |
| --- | --- |
| `markdownReviewNotes.addComment` | Add Unresolved Comment |
| `markdownReviewNotes.resolveComment` | Mark Comment Resolved |
| `markdownReviewNotes.navigateToSource` | Go to Source Line |
| `markdownReviewNotes.navigateToComment` | Go to Comment |
| `markdownReviewNotes.exportReviewContext` | Export Review Context |

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `markdownReviewNotes.insertSourceMarker` | `true` | Insert the inline `<!-- review-note: ID -->` anchor above the commented line (the durable source link). |
| `markdownReviewNotes.removeMarkerOnResolve` | `true` | Also remove the inline anchor when resolving a comment. |
| `markdownReviewNotes.unresolvedSectionTitle` | `Unresolved Comments` | Title of the level-1 section that groups unresolved comments. |
| `markdownReviewNotes.removeEmptySection` | `true` | Remove the empty section (and a preceding `---`) when the last comment is resolved. |
| `markdownReviewNotes.showInlineComments` | `true` | Render saved comments as native inline threads beneath the commented line. |
| `markdownReviewNotes.enableCodeLens` | `true` | Show the `Go to source` / `Resolve` CodeLens above comment blocks. |

---

## Comment schema

```md
## COMMENT-2026-05-24-001

Created: 2026-05-24T14:32:11Z
Status: unresolved

Selected Text:
> Example selected text

Comment:
Review message here.
```

The reviewed location is recorded by the inline anchor in the source, whose core matches the comment id:

```md
<!-- review-note: 2026-05-24-001 -->
Example selected text
```

### Why there is no line number

A stored `Line: N` drifts the moment any text is inserted above it (including adding another comment higher up in the file). Instead, the link is the inline `<!-- review-note: ID -->` anchor, which physically lives next to the content and moves with it — so the reference is always correct, in the editor, in `git diff`, and for an AI reading the file. To find a comment's source, search the file for its anchor core (`review-note: 2026-05-24-001`); `Selected Text` is a secondary, human-readable locator.

> Markdown is the source of truth. Git is the persistence layer. AI readability matters more than machine optimization.

---

## Development

```bash
npm install
npm run compile      # one-off build
npm run watch        # incremental build
npm test             # unit tests for the markdown engine (node:test)
```

Press <kbd>F5</kbd> in VSCode to launch the **Extension Development Host** (it opens the bundled `examples/` folder). Edits in `src/` are picked up by the `watch` task.

### Architecture

```
src/
  extension.ts                     # activation + command/provider registration
  providers/
    ReviewCodeActionProvider.ts    # lightbulb / Ctrl+. actions (FR-2)
    ReviewCommentController.ts     # Comments API: gutter +, inline input, inline threads
  services/
    MarkdownService.ts             # pure markdown engine (ids, parse, insert, remove) — no vscode dep
    CommentService.ts              # add / resolve / export orchestration (WorkspaceEdit)
    NavigationService.ts           # CodeLens + go-to-source (FR-9)
  models/
    ReviewComment.ts               # domain type
  test/
    markdownService.test.ts        # unit tests for the engine
```

`MarkdownService` deliberately has no `vscode` dependency, so the parsing/formatting logic is unit-testable in plain Node.

---

## Example

[`examples/sample-review.md`](examples/sample-review.md) is a small architecture-decision doc to practice on. Open it in the Extension Development Host (press <kbd>F5</kbd>) and follow the short walkthrough at the bottom: add a comment, watch the `# Unresolved Comments` section appear with an inline thread, then resolve it.

---

## Non-goals

This is **not** a full GitHub review system, a collaborative SaaS, a live multi-user tool, an issue tracker, a markdown CMS, or a WYSIWYG editor. It is a lightweight, markdown-native way to capture review notes locally.

## License

MIT — see the `LICENSE` file.

---

## Built AI-first

Markdown Review Notes was designed and implemented by AI coding agents, end to end — a working proof of [AI-First engineering](https://www.ainovasystems.com), not a claim about it.

---

Created by **Dmitrij Zykovic** — Fractional CTO at [Ainova Systems](https://www.ainovasystems.com)

Helping teams adopt AI automation, establish AI-First SDLC, and build fully autonomous AI engineering pipelines.

[LinkedIn](https://www.linkedin.com/in/dmitrijz/) · [Advisory & Consulting](https://www.ainovasystems.com)
