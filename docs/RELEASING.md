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

Both registry steps are skipped when their secret is absent, so the pipeline is useful
before either is configured: it still produces a verified, attested GitHub Release, and the
job summary tells you to upload the VSIX by hand.

| Secret | Registry | How to create it |
| --- | --- | --- |
| `VSCE_PAT` | Visual Studio Marketplace | An Azure DevOps personal access token for the `ainova-systems` publisher, scoped to **Marketplace → Manage**, with **All accessible organizations** selected. |
| `OVSX_PAT` | [Open VSX](https://open-vsx.org) | An access token from your Open VSX user settings; the namespace `ainova-systems` must exist and list you as a member. |

Add them under **Settings → Secrets and variables → Actions**. To publish a tag that was
released before the secret existed, run the **Release** workflow manually and give it that
tag — the release is refreshed in place rather than duplicated.

Rotate a leaked token by revoking it at the provider first, then replacing the secret. An
Azure DevOps PAT expires after at most a year; the publish step failing with a 401 usually
means it lapsed, not that the release is broken.

**The `VSCE_PAT` is shared with the other `ainova-systems` extensions.** It authenticates the
publisher, not an extension, so the same token publishes
[Sandbox Console](https://github.com/ainova-systems/code-sandbox-console) too, and it is
stored as a repository secret in each of them. Renewing it therefore means updating **every**
repository that holds a copy — a token replaced in one and forgotten in another fails the
next release there, after its tag has already been pushed:

```bash
for repo in markdown-review-comments code-sandbox-console; do
  gh secret set VSCE_PAT --repo "ainova-systems/$repo"
done
```

The same warning applies in reverse to revocation: revoking the token stops releases
everywhere, not just here.

### Adding a manual approval gate

If you later want a human to confirm each Marketplace upload, create a GitHub Environment
(say `marketplace`) with yourself as a required reviewer, move the two publish steps into
their own job, and give that job `environment: marketplace`. The build and the GitHub
Release still complete unattended; only the registry upload waits.

## First publish

What has to exist beforehand is the **publisher**, not the extension: `ainova-systems`
already publishes [Sandbox Console](https://marketplace.visualstudio.com/items?itemName=ainova-systems.sandbox-console),
so `vsce publish` creates the `markdown-review-comments` entry on its first run. With
`VSCE_PAT` configured, the first release needs no portal step at all.

Without the secret, take the VSIX from the GitHub Release the pipeline produced and upload it
once through the
[manage portal](https://marketplace.visualstudio.com/manage/publishers/ainova-systems)
(**+ New extension** → drag the file). Either way the Marketplace runs a malware scan that
takes a few minutes and ends at `verified`; the listing is live only after it does.

Check afterwards that the version really went public:

```bash
curl -s -X POST https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery \
  -H 'Accept: application/json;api-version=3.0-preview.1' \
  -H 'Content-Type: application/json' \
  -d '{"filters":[{"criteria":[{"filterType":7,"value":"ainova-systems.markdown-review-comments"}]}],"flags":914}'
```
