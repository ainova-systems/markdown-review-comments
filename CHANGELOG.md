# Changelog

All notable changes to **Markdown Review Comments** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-09-04

First public release on the Visual Studio Marketplace.

### Added

- Published as `ainova-systems.markdown-review-comments`. Install from the Marketplace, or
  with `code --install-extension ainova-systems.markdown-review-comments`.
- **Works in restricted and remote workspaces.** The extension only reads and writes the
  Markdown files you open — it runs no commands and makes no network calls — so it is now
  declared as supported in untrusted workspaces and on virtual file systems.

### Fixed

- The unit-test script no longer depends on a Node 22 feature, so the suite runs on the
  Node 20 floor the extension targets.

### Changed

- Documentation rewritten around what the extension actually does: what the anchor is for,
  why no line number is stored, how a review is handed to an AI agent, and how the design
  compares with sidecar files, preview editors and inline markup.

## [0.2.0] - 2026-05-24

### Changed

- **Inline, GitHub-style commenting.** Adding a comment now uses VS Code's native
  Comments API: hover the gutter → **+** → type in an input box right below the
  line. The lightbulb / `Ctrl+.` / palette / `Ctrl+Alt+M` open the same inline
  input at the selection (no more top-of-window prompt).
- **Saved comments render as inline threads** anchored beneath their source
  line, each with a **Resolve** action.
- **Removed the `Line:` field.** Line numbers drift when text is inserted above
  them. The inline `<!-- review-note: ID -->` anchor is now the sole, stable
  source link (it moves with the text). Old files with `Line:` still parse.

### Added

- `markdownReviewComments.showInlineComments` setting to toggle inline threads.
- Navigation fallback by selected text when an anchor is absent.

## [0.1.0] - 2026-05-24

Initial MVP.

### Added

- `Add Unresolved Comment` from a selection via lightbulb, `Ctrl+.`, command palette, context menu, or `Ctrl+Alt+M`.
- Automatic creation and reuse of the `# Unresolved Comments` section.
- Deterministic, human-readable comment ids `COMMENT-YYYY-MM-DD-NNN`.
- Comment blocks recording the timestamp, status, selected text, and body.
- AI-friendly plain-Markdown output.
- Inline `<!-- review-note: ID -->` source anchors (optional).
- `Mark Comment Resolved`, which removes the comment block and its anchor.
- CodeLens navigation between comments and their source lines.
- `Export Review Context` to produce an LLM-prompt-friendly summary of unresolved comments.
- Settings to toggle anchors, anchor removal on resolve, the section title, empty-section cleanup, and CodeLens.
- Unit tests for the Markdown engine.

[Unreleased]: https://github.com/ainova-systems/markdown-review-comments/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/ainova-systems/markdown-review-comments/releases/tag/v0.3.0
[0.2.0]: https://github.com/ainova-systems/markdown-review-comments/releases/tag/v0.2.0
[0.1.0]: https://github.com/ainova-systems/markdown-review-comments/releases/tag/v0.1.0
