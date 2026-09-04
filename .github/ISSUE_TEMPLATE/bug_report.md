---
name: Bug report
about: A command errored, produced wrong markdown, or behaved unexpectedly
title: "[bug] "
labels: bug
---

## What happened

<!-- Describe the unexpected behavior. What did the extension do wrong? -->

## Steps to reproduce

1. <!-- Open a markdown file -->
2. <!-- e.g. select a line and run "Add Unresolved Comment" (Ctrl+Alt+M / Cmd+Alt+M) -->
3. <!-- ... -->

### Minimal markdown sample

<!-- The smallest markdown file that triggers the bug. Include any existing
     `<!-- review-note: ID -->` anchors or the `# Unresolved Comments` section. -->

```markdown
# Title

Some text on the line being commented.
```

## Expected

<!-- What you thought the extension should do. -->

## Actual

<!-- What actually happened. Paste the resulting markdown if the file was modified
     incorrectly, and any error from the Developer Tools console
     (Help → Toggle Developer Tools → Console). -->

## Environment

- VS Code version / editor: <!-- Help → About, e.g. VS Code 1.92.0, or Cursor 0.42 -->
- OS: <!-- e.g. macOS 15.0, Ubuntu 24.04, Windows 11 -->
- Extension version: <!-- e.g. 0.3.0 -->
- Installed from: <!-- Marketplace / VSIX / built from source -->

## Relevant settings

<!-- Paste any non-default `markdownReviewComments.*` settings from your settings.json. -->

```json
{
}
```
