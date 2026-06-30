# PRD — VSCode Extension: Markdown Review Comments

## Vision

Build a lightweight VSCode extension that allows users to create GitHub-style inline review comments inside Markdown files without requiring GitHub PRs, GitLens, or external systems.

The extension should feel native to VSCode:
- user selects a line or text range
- triggers quick action (lightbulb / Ctrl+.)
- enters a comment
- comment is automatically appended to an `Unresolved Comments` section at the bottom of the markdown file
- original line reference is preserved
- comments are AI-readable and git-friendly

The extension is designed for:
- AI-first repositories
- architectural review workflows
- spec-driven development
- async design reviews
- local-first knowledge capture
- Cursor / Claude Code / Codex workflows

Core philosophy:
- markdown-native
- git-native
- no database
- no SaaS backend
- no PR dependency
- minimal UI
- AI-friendly format
- lightweight and fast

---

# Product Goals

## Primary Goal

Allow developers to attach structured review notes to markdown content using a GitHub-review-like UX directly inside VSCode.

## Secondary Goals

- Make comments readable by AI agents
- Preserve review context in repository history
- Keep notes local and portable
- Avoid heavy Git tooling
- Enable unresolved/resolved workflows
- Support long-term architectural documentation review

---

# Non Goals

Not trying to build:
- full GitHub review system
- collaborative SaaS
- live multi-user comments
- issue tracker
- markdown CMS
- rich threaded discussions
- WYSIWYG editor
- inline rendered overlays synced across files

---

# Primary User

Senior engineers, architects, AI-first developers, and technical writers working heavily in:
- Markdown
- specs
- ADRs
- architecture docs
- AI instruction files
- repository documentation

Typical environments:
- Cursor
- VSCode
- Claude Code workflows
- spec-driven repositories

---

# User Stories

## Story 1

As a developer,
I want to select a markdown line,
and quickly add a review comment using a lightbulb action,
so that I can leave architectural or implementation notes.

## Story 2

As an AI-first engineer,
I want comments stored directly inside markdown,
so that AI agents can read them as context.

## Story 3

As a reviewer,
I want unresolved comments grouped at the bottom of the file,
so that review discussions remain centralized and clean.

## Story 4

As a repository maintainer,
I want comments preserved in Git,
so that review history survives branches and AI refactors.

---

# UX Requirements

## Main Interaction

### Flow

1. User selects line or text range
2. User presses:
   - lightbulb action
   - OR Ctrl+.
   - OR command palette
3. User chooses:

```text
Add Unresolved Comment
```

4. Input box appears
5. User enters comment
6. Extension appends comment to bottom section
7. Original selection gets reference marker

---

# Example UX

## Source Section

```md
## Option B

Decouple the Agent Skills directory entirely from adapters.
```

## After Comment Added

```md
## Option B

<!-- review-note: 2026-05-24-001 -->
Decouple the Agent Skills directory entirely from adapters.
```

Bottom section:

```md
---

# Unresolved Comments

## COMMENT-2026-05-24-001

Line: 12

Selected Text:
> Decouple the Agent Skills directory entirely from adapters.

Comment:
Need to validate whether ownership belongs to sync.sh or target adapters.

Status: unresolved
```

---

# Functional Requirements

## FR-1 — Markdown Only

Extension initially supports only:

```text
*.md
```

No other languages in MVP.

---

## FR-2 — Code Action Integration

Extension must integrate with:

```ts
CodeActionProvider
```

Actions appear:
- via lightbulb
- via Ctrl+.
- via command palette

---

## FR-3 — Add Comment Command

Command name:

```text
markdownReviewComments.addComment
```

Behavior:
- capture selection
- ask for comment
- append formatted comment block
- create section if missing

---

## FR-4 — Automatic Section Management

If missing:

```md
# Unresolved Comments
```

extension creates it automatically.

All comments appended below it.

---

## FR-5 — Comment ID Generation

Comment IDs must be deterministic and human-readable.

Format:

```text
COMMENT-YYYY-MM-DD-XXX
```

Example:

```text
COMMENT-2026-05-24-001
```

---

## FR-6 — Line Reference

Each comment stores:
- line number
- selected text
- timestamp
- comment body
- status

---

## FR-7 — AI-Friendly Format

Output format must:
- be readable as plain markdown
- work well in LLM prompts
- avoid JSON unless necessary
- avoid hidden metadata dependency

---

## FR-8 — Resolve Comment

MVP+1 feature.

User can:

```text
Mark Comment Resolved
```

Behavior:
- updates status
- optionally moves to `Resolved Comments`

---

## FR-9 — Navigation

Clicking comment ID should navigate to original line.

Implementation options:
- markdown links
- vscode command URI
- anchor markers

MVP may skip bidirectional navigation.

---

# Technical Requirements

## Stack

- TypeScript
- VSCode Extension API
- No backend
- No external DB

---

# Recommended Architecture

## Components

### 1. Code Action Provider

Responsible for:
- lightbulb actions
- command availability

---

### 2. Comment Service

Responsible for:
- ID generation
- markdown formatting
- parsing existing comments
- insertion logic

---

### 3. Markdown Parser

Responsible for:
- finding unresolved section
- appending comments safely
- avoiding duplicate sections

Simple regex acceptable for MVP.

---

### 4. Navigation Service

Responsible for:
- line lookup
- comment lookup
- jump actions

---

# Suggested File Structure

```text
src/
  extension.ts
  providers/
    ReviewCodeActionProvider.ts
  services/
    CommentService.ts
    MarkdownService.ts
    NavigationService.ts
  models/
    ReviewComment.ts
```

---

# Comment Schema

## Markdown Representation

```md
## COMMENT-2026-05-24-001

Line: 42
Created: 2026-05-24T14:32:11Z
Status: unresolved

Selected Text:
> Example selected text

Comment:
Review message here.
```

---

# MVP Scope

## Included

- add comment
- unresolved comments section
- line references
- markdown-only
- quick action support
- AI-friendly output

## Excluded

- threading
- collaboration
- syncing
- avatars
- GitHub API
- comments database
- webview UI
- floating inline widgets
- notifications

---

# Future Ideas

## AI Integration

Commands:

```text
Export Review Context
```

Produces:
- all unresolved comments
- grouped by section
- optimized for LLM prompts

---

## AI Review Mode

Possible future:

```text
Ask AI To Resolve Comments
```

Workflow:
- collect unresolved comments
- send to Claude/Cursor/OpenAI
- propose changes

---

## Inline Decorations

Future enhancement:
- gutter icons
- hover previews
- unresolved badges

---

# Performance Requirements

Extension must:
- activate fast
- avoid full markdown AST parsing for MVP
- work on large markdown files
- avoid background indexing
- consume minimal memory

Target:

```text
<50ms action latency
```

---

# Design Principles

## Principle 1

Markdown is source of truth.

## Principle 2

Git is persistence layer.

## Principle 3

AI readability matters more than machine optimization.

## Principle 4

Low friction beats feature richness.

## Principle 5

No proprietary storage.

---

# Suggested Extension Names

- Markdown Review Comments
- AI Review Notes
- Markdown Inline Notes
- Review Anchors
- MD Review Comments
- Local Review Notes
- ReviewBlocks
- Spec Review Notes

---

# Suggested Startup Prompt

Build a VSCode extension in TypeScript called "Markdown Review Comments".

The extension should work only with markdown files.

Main UX:
- user selects line or range
- user triggers Ctrl+. or lightbulb action
- action called "Add Unresolved Comment"
- input box asks for comment
- extension appends structured markdown comment block into a bottom section called "# Unresolved Comments"
- if section does not exist, create it
- generated comments must include:
  - unique ID
  - line number
  - selected text
  - timestamp
  - unresolved status
  - comment body

Requirements:
- use VSCode CodeActionProvider
- use TypeScript
- no backend
- no database
- markdown should remain human-readable
- optimize for AI readability
- extension should be lightweight
- support command palette
- structure code cleanly into services/providers/models

Generate:
- package.json
- extension.ts
- providers
- services
- command registration
- markdown insertion logic
- README
- example screenshots placeholders
- clean architecture
- runnable MVP

