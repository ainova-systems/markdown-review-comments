---
description: Project-specific configuration consumed by the core pack's rules and skills
---

# Project Profile

Filled from this repository. Values the packs resolve before auto-detecting.

## Branching

- default_branch: main
- integration_branch: none
- branch_prefixes: feature/, bugfix/, hotfix/, release/
- update_strategy: merge
- conflict_skill: git-resolve-conflicts
- protected_branches: main

## Commits

- commit_style: pack-default
- reference_ids: none
- artifact_language: repo-default

## Verification

- typecheck: npm run compile
- lint: none
- test: npm test
- verify: npm run verify
- coverage_gate: none

## Workspace

- handoff_dir: auto

## Pull requests

- platform: github
- cli: gh
- pr_target: auto
- merge_method: squash
- auto_open_pr: true
- pr_template: auto
- pr_risk_size: off
- pr_size_thresholds: small <= 5 files & 50 lines; large >= 20 files or 400 lines; else medium
- pr_risk_globs: high: src/services/MarkdownService.ts, .vscodeignore, scripts/check-package-contents.mjs; medium: src/**; low: **/*.md
- delete_local_branch: true
- delete_remote_branch: false
- post_merge: none

## Releases

- release_flow: tag-on-default
- release_cut: release-pr
- release_review: none
- manual_apply_globs: none
- drift_check: none
- changelog: continuous
- release_docs: none
- release_artifact: github-release
- release_notes: changelog-section
- tagger: maintainer
- version_source: package.json
- tag_format: vX.Y.Z

## Documentation

- specs_dir: docs/specs
- spec_grouping: flat
- execution_mode: supervised
- features_dir: docs/features
- rules_dir: docs/rules
- decisions_dir: docs/decisions
- adr_naming: date

## Tracker

- tracker: auto
- tracker_cli: gh
- tracker_item_ref: auto
