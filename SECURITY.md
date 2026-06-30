# Security Policy

Please report vulnerabilities **privately** via GitHub Security Advisories:
<https://github.com/ainova-systems/markdown-review-comments/security/advisories>

If that page does not accept reports, open a regular issue asking for a private
contact channel — **without any vulnerability details**.

Do not open public issues for security reports.

## Scope

This extension reads and writes only the local markdown files in your open
workspace. It stores no data, provisions no credentials, makes no network calls,
and has zero runtime dependencies. The attack surface is therefore small —
the most likely class of issue is malformed input corrupting a markdown file.

0.x releases receive security fixes on a best-effort basis.
