# Security Policy

## Reporting a vulnerability

Report privately via GitHub Security Advisories:
<https://github.com/ainova-systems/markdown-review-comments/security/advisories/new>

If that page does not accept your report, open a regular issue asking for a private contact
channel — **without any vulnerability details**. Please do not open public issues for
security reports.

Expect an acknowledgement within a few working days. Fixes ship as a normal release, and the
advisory is published once users have a version to move to.

## Supported versions

Only the latest published release receives fixes. The extension is on `0.x`; security fixes
are made on a best-effort basis and always as a new version, never as a re-upload of an
existing one.

## Attack surface

The extension reads and writes the Markdown files you open, and nothing else. It:

- has **no runtime dependencies** — the VSIX contains only this project's compiled output;
- makes **no network calls** and stores **no data** outside the files you edit;
- executes **no commands** and spawns no processes;
- is declared safe in untrusted workspaces and on virtual file systems, because none of the
  above changes with the trust level of the workspace.

The realistic risk is therefore corruption rather than compromise: malformed input, or an
unusual document shape, causing the extension to write a Markdown file incorrectly. Reports
of that kind are welcome as ordinary issues — a minimal sample that reproduces it is worth
more than a description.

## Supply chain

Released artifacts are built by
[the release workflow](.github/workflows/release.yml) from a tagged commit and carry a
signed build-provenance attestation, so a VSIX can be traced to the run and the source that
produced it:

```bash
gh attestation verify markdown-review-comments-X.Y.Z.vsix --repo ainova-systems/markdown-review-comments
```

The set of files inside the VSIX is asserted against an explicit list on every build, so a
new file cannot reach users unnoticed. Build dependencies are updated by Dependabot and
analysed by CodeQL on every push.
