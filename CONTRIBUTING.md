# Contributing

Thanks for your interest in `agents-opencode`. Issues and pull requests are welcome.
This guide covers the repository's working agreements: quality checks, the pre-commit
review gate, dependency overrides, and the automated release process.

Use [conventional commit](https://www.conventionalcommits.org/) messages (`feat:`,
`fix:`, `docs:`, ...) — the release pipeline derives version numbers from them.

## Development setup

- Node.js 24 or newer is required (`engines` in `package.json`).
- Install dev tooling once with `npm ci`.
- Enable the review gate hooks (`pre-commit` + `post-commit`) once per clone with `npm run gate:install`.

## Quality commands

Run the unified validation suite before opening a pull request:

```bash
npm run doctor   # full local suite; `npm test` aliases it
```

`doctor` chains the repository's Tier 1 checks, including agent configuration and
OpenCode schema validation, installer lifecycle and plugin guard tests, docs link
checks, agent evals, context-size budgets, npx package integrity, and markdown lint.

Individual validation gates are exposed as `npm run validate:*` scripts, for example:

- `npm run validate:agents` — agent frontmatter, permissions, and skill allowlists
- `npm run validate:opencode-schema` — OpenCode schema conformance (add `:v2` for the
  v2-strict target check)
- `npm run validate:docs` — internal link validation; `validate:docs:external` adds the
  network-dependent external link check
- `npm run validate:installer` — installer lifecycle and language-pruning tests
- `npm run lint:md` — markdown lint (`lint:md:fix` autofixes)

Run `npm run` to list every available script.

The docs site (Astro Starlight, `site/`) builds independently:

```bash
cd site
npm ci
npm run build   # static output in site/dist; `npm run dev` for a local preview
```

## Pre-commit review gate

A versioned pair of Git hooks stops commits that have not passed the review gate.
Install them once per clone:

```bash
npm run gate:install
```

The flow for each batch of changes is plan → freeze → review → pass → commit:

```bash
# Non-trivial diffs: write .gate/plan.md first, with both sections:
#   ## Acceptance          -> - <observable criterion>
#   ## Checks              -> - run: npm test / - expect: exit 0
npm run gate:freeze   # freeze the staged diff (.gate/diff.patch + .gate/manifest.json)
# Tier 1 (`npm run doctor`) and the Tier 2 review lenses run against the frozen diff
npm run gate:lens -- --name requirements --verdict PASS --findings 0   # repeat per lens
npm run gate:pass -- --verdict PASS --lenses requirements,code
git commit            # pre-commit verifies the pass; post-commit consumes the marker
```

`gate:pass` requires an explicit `--verdict PASS` or `--verdict PASS-WITH-CAVEATS`.
There is no default: if the flag is missing (for example `npm run gate:pass --verdict PASS`
without the `--`, which lets npm swallow it), the command fails with a usage error
instead of silently recording a verdict.

For a **trivial** diff (≤2 staged entries, no risk paths, and no gitlinks), the whole path is one
command:

```bash
npm run gate:quick   # gate:freeze → npm run doctor → gate:pass --verdict=PASS
```

`gate:quick` records a Tier 1 pass with no lenses. If the diff is actually
non-trivial, `gate:freeze` refuses (it needs `.gate/plan.md`) and points you at the
Tier 2 lens flow above.

Rules that are enforced at the tooling layer:

- A **non-trivial diff** requires `.gate/plan.md` with a `## Checks` section: one
  `- run:` command per `- expect:` outcome. `gate:freeze` hashes the plan into the
  manifest and refuses a missing, edited-at-freeze-time, or symlinked plan; both
  `gate:pass` and the pre-commit hook recompute the hash and refuse a plan edited
  after the freeze. Placeholder commands (`true`, `:`, `exit 0`) are rejected.
- `--lenses` accepts only `requirements`, `code`, `security`, `ux-responsive`,
  `architecture`, and `ponytail`. A non-trivial diff must include `requirements`, or
  record why not:
  `--skip-requirements "no behaviour change"` (at least 12 characters; the reason is
  printed at pass time and at commit time).
- A **non-trivial plan** must state acceptance criteria: a `## Acceptance` section with
  at least one `-` bullet criterion. `gate:freeze` refuses a plan that has `## Checks` but
  no criteria, so the requirements lens always has a spec to judge against.
- A **non-trivial panel** must record hash-bound evidence per lens. `gate:pass` refuses
  a recorded lens with no `.gate/lens-<name>.md`, so a lens name is not a review.
- A **non-trivial diff** must record **at least 2 distinct lenses** in `gate:pass`.
  Non-trivial means any staged path under `scripts/`, `.opencode/`, `.github/`,
  `.githooks/`, `site/`, `evals/`, or `adapters/`; the root files `install.js`,
  `package.json`, `opencode.json`, `AGENTS.md`, `.gitleaks.toml`, `.gitmodules`, or
  `.npmrc`; any `package-lock.json` at any depth; a staged submodule pointer (gitlink)
  change — only the pointer appears in the superproject diff, so the content it
  references is not reviewable from it; or more than 2 staged entries.
- The recorded pass is bound to the frozen snapshot (via its staged hash). The
  **post-commit** hook consumes the marker once the commit object exists, so an
  aborted commit (GPG signing failure, editor abort, hook crash) keeps the
  approval for a retry — any successful `git commit`, including `--no-verify` and
  empty commits, uses it up.
- Residual if `post-commit` is missing or inert, or the commit is created by
  `git merge` (which runs `post-merge`, not `post-commit`): a pending marker
  lingers and binds the staged **tree** (not a diff against a base), so after
  `HEAD` has moved it could re-approve the same tree.
- Empty commits (a staged tree identical to `HEAD`) are exempt: the hook allows
  them without a marker, which is what `git commit --allow-empty` release tooling
  relies on.

`SKIP_GATE=1` is a **per-command** bootstrap/emergency escape hatch
(`SKIP_GATE=1 git commit ...`). Never export it in a shell profile or CI job.

The full specification — tiers, lenses, budgets, triage, and skip criteria — lives in
[`site/src/content/docs/review-gate.md`](site/src/content/docs/review-gate.md).

## Releasing

Releases are automated with [release-please](https://github.com/googleapis/release-please)
in the **Release & Publish to npm** workflow
([`.github/workflows/publish.yml`](.github/workflows/publish.yml)), triggered on every
push to `main` (and manually via `workflow_dispatch`):

1. The `release` job maintains a release PR (for example `chore(main): release 2.6.0`)
   whose version bump is computed from the conventional commits since the last release:
   `fix:` → patch, `feat:` → minor, `feat!:` / `BREAKING CHANGE:` → major.
2. Merging the release PR creates the Git tag and GitHub Release.
3. The `publish` job then publishes the package to npm (trusted publishing with
   provenance) from the `npm-publish` environment.

Maintainer notes:

- release-please requires the repository setting **Settings → Actions → General →
  Allow GitHub Actions to create and approve pull requests** to be ON; without it, the
  release PR cannot be created or updated.
- To force a specific version, include a `Release-As: X.Y.Z` footer in a commit on
  `main`:

  ```bash
  git commit --allow-empty -m "chore: release 3.0.0" -m "Release-As: 3.0.0"
  ```

- Squash and rebase merges create new commits on `main`; unless branch protection
  requires signed commits, those merge commits are unsigned.

## Dependency overrides

`package.json` carries an `overrides` block that pins transitive packages in the
dev/lint toolchain (the markdownlint dependency chain) to versions that include advisory
fixes. The pins let `npm audit` report zero vulnerabilities without accepting npm's
proposed fixes, which cross breaking ranges (for example, major downgrades).

Current pins (see `package.json`):

- `js-yaml`: `^5.4.1`
- `markdown-it`: `~14.3.1`
- `brace-expansion`: `^5.0.12`
- `katex`: `^0.18.2`
- `smol-toml`: `^1.9.1`

They affect development installs only — the published package has no runtime
dependencies. Revisit each pin when the dependent upstream package widens its range to
include the fixed version; the override can then be removed.

## License

MIT — see [LICENSE](LICENSE). By contributing, you agree that your contributions are
licensed under the same terms.
