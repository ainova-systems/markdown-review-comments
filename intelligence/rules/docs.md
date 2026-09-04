---
paths:
  - "docs/**"
description: "Documentation layout, naming and rename discipline under docs/"
---

# Documentation under `docs/`

## Naming

Files and directories under `docs/` use lowercase kebab-case — `prd.md`,
`releasing.md`, `media/src/hero.svg`. Uppercase is reserved for the conventional
root files that GitHub, npm and the Marketplace discover by name: `README.md`,
`CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`,
`LICENSE`, `AGENTS.md`. Nothing under `docs/` is found by a tool looking for a
fixed name, so it follows the casing the rest of the repository uses.

Git on Windows and macOS is case-insensitive by default, so a case-only rename
needs `git mv --force <old> <new>` to be recorded as a rename rather than
silently dropped.

## What belongs here

`docs/` holds reference material a reader seeks out deliberately: the behaviour
contract, the maintainer runbooks, and the spec substrate whose directories the
project profile names. Product prose for users stays in `README.md` and the
contributor workflow stays in `CONTRIBUTING.md` — add a document here instead of
growing a root file when the material is long, stable and consulted rather than
read once.

## Renaming or removing a document

Every document here is linked from at least one of `README.md`,
`CONTRIBUTING.md`, the always-on context rule and a workflow. Update every
reference in the same change, and confirm none survive:

```bash
git ls-files | xargs grep -n '<old-name>'
```

## Generated media

`docs/media/*.png` and `images/icon.png` are rendered by `npm run media` from the
hand-authored SVGs in `docs/media/src/` and the diagram definitions inside
`scripts/render-media.mjs`. A diagram change is a script change. Never hand-edit
a generated PNG or SVG, and commit the regenerated output — the Marketplace
renders the README straight from the repository.
