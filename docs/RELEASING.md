# Releasing

A release is one tag push. Everything after it is automated by
[`.github/workflows/release.yml`](../.github/workflows/release.yml).

```text
tag vX.Y.Z  →  guard  →  verify  →  package  →  attest  →  GitHub Release
                                                            ├─ Marketplace   (VSCE_PAT)
                                                            └─ Open VSX      (OVSX_PAT)
```

## Cut a release

1. **Land everything first.** `main` is green and holds every change that ships.

2. **Write the changelog section.** Promote `## [Unreleased]` in
   [`CHANGELOG.md`](../CHANGELOG.md) into `## [X.Y.Z] - YYYY-MM-DD`, in user language — what
   changed for someone using the extension, not which files moved. This text becomes the
   GitHub Release notes verbatim, so read it as a stranger would.

3. **Bump `version` in `package.json`** to the same `X.Y.Z`. Semantic versioning: a changed
   Markdown format or a removed setting is breaking, new commands or settings are a minor,
   everything else is a patch.

4. **Check what the release will say and ship:**

   ```bash
   npm run verify                              # strict tsc + unit tests
   node scripts/check-package-contents.mjs     # exactly the 12 expected files
   node scripts/changelog-section.mjs X.Y.Z    # the release notes, as they will appear
   ```

5. **Merge to `main`** (the release commit goes through a PR like any other change), then
   tag the merge commit and push the tag:

   ```bash
   git checkout main && git pull --ff-only
   git tag -a vX.Y.Z -m "Markdown Review Comments X.Y.Z"
   git push origin vX.Y.Z
   ```

6. **Watch the run.** The job summary states, per registry, whether it published or skipped
   and why.

Never move or re-cut a published tag. A pipeline failure after publishing ships as the next
patch release, not as a rewrite of the failed one — Marketplace versions are **write-once**,
so a burned number cannot be reused.

## What the pipeline enforces

Before anything is published:

- the tag, `package.json` and `CHANGELOG.md` all name the same version;
- `npm run verify` is green — strict `tsc` plus the unit suite;
- the VSIX contains exactly the expected files, so a new directory cannot leak to users
  (`vsce` ignores `.gitignore` once a `.vscodeignore` exists — this is the check that
  catches it);
- the VSIX carries a signed build-provenance attestation tying it to this workflow run and
  this commit.

## Publishing credentials

Both registry steps are skipped when their secret is absent, so the pipeline is useful before
either is configured: it still produces a verified, attested GitHub Release, and the job
summary tells you to upload the VSIX by hand.

`VSCE_PAT` (Visual Studio Marketplace) and `OVSX_PAT` (Open VSX) are provisioned by the
maintainers out of band; how they are minted and where else they are held is deliberately not
recorded in this repository. Both are held as repository secrets under **Settings → Secrets
and variables → Actions**.

Each token authenticates a **publisher**, not this extension, so renewal and revocation are
publisher-wide decisions: replacing a token here updates only this repository's copy, and
revoking one stops every release that uses it.

To publish a tag that was released before its secret existed, run the **Release** workflow
manually and give it that tag — the release is refreshed in place rather than duplicated. A
publish step failing with `401` means the credential lapsed or was revoked, not that the
release is broken.

### Adding a manual approval gate

If you later want a human to confirm each Marketplace upload, create a GitHub Environment
(say `marketplace`) with yourself as a required reviewer, move the two publish steps into
their own job, and give that job `environment: marketplace`. The build and the GitHub
Release still complete unattended; only the registry upload waits.

## After a publish

The Marketplace runs a malware scan on every upload; it takes a few minutes and ends at
`verified`. The listing is live only after it does. Confirm the version really went public:

```bash
curl -s -X POST https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery \
  -H 'Accept: application/json;api-version=3.0-preview.1' \
  -H 'Content-Type: application/json' \
  -d '{"filters":[{"criteria":[{"filterType":7,"value":"ainova-systems.markdown-review-comments"}]}],"flags":914}'
```
