# Changelog

All notable changes to **Markdown Review Notes** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.0] - 2026-05-24

### Changed

- **Inline, GitHub-style commenting.** Adding a comment now uses VSCode's native
  Comments API: hover the gutter → **+** → type an input box right below the
  line. The lightbulb / `Ctrl+.` / palette / `Ctrl+Alt+M` open the same inline
  input at the selection (no more top-of-window prompt).
- **Saved comments render as inline threads** anchored beneath their source
  line, each with a **Resolve** action.
- **Removed the `Line:` field.** Line numbers drift when text is inserted above
  them. The inline `<!-- review-note: ID -->` anchor is now the sole, stable
  source link (it moves with the text). Old files with `Line:` still parse.

### Added

- `markdownReviewNotes.showInlineComments` setting to toggle inline threads.
- Navigation fallback by selected text when an anchor is absent.

## [0.1.0] - 2026-05-24

Initial MVP.

### Added

- `Add Unresolved Comment` from a selection via lightbulb, `Ctrl+.`, command palette, context menu, or `Ctrl+Alt+M` (FR-1, FR-2, FR-3).
- Automatic creation and reuse of the `# Unresolved Comments` section (FR-4).
- Deterministic, human-readable comment ids `COMMENT-YYYY-MM-DD-XXX` (FR-5).
- Comment blocks recording line, timestamp, status, selected text, and body (FR-6).
- AI-friendly plain-markdown output (FR-7).
- Inline `<!-- review-note: ID -->` source anchors (optional).
- `Mark Comment Resolved`, which removes the comment block and its anchor (FR-8).
- CodeLens navigation between comments and their source lines (FR-9).
- `Export Review Context` to produce an LLM-prompt-friendly summary of unresolved comments.
- Settings to toggle anchors, anchor removal on resolve, the section title, empty-section cleanup, and CodeLens.
- Unit tests for the markdown engine.
