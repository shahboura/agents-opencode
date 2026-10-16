# Contributing

Thanks for your interest in `agents-opencode`. Issues and pull requests are welcome.
This guide covers the repository's working agreements: quality checks, the pre-commit
review gate, dependency overrides, and the automated release process.

Use [conventional commit](https://www.conventionalcommits.org/) messages (`feat:`,
`fix:`, `docs:`, ...) — the release pipeline derives version numbers from them.

## Development setup

- Node.js 24 or newer is required (`engines` in `package.json`).
- Install dev tooling once with `npm ci`.
- Enable the pre-commit review gate once per clone with `npm run gate:install`.

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

A versioned Git hook stops commits that have not passed the review gate. Install it
once per clone:

```bash
npm run gate:install
```

The flow for each batch of changes is freeze → review → pass → commit:

```bash
npm run gate:freeze   # freeze the staged diff (.gate/diff.patch + .gate/manifest.json)
# Tier 1 (`npm run doctor`) and the Tier 2 review lenses run against the frozen diff
npm run gate:pass -- --verdict PASS --lenses requirements,code
git commit            # the hook verifies the recorded pass and consumes the marker
```

Rules that are enforced at the tooling layer:

- A **non-trivial diff** must record **at least 2 distinct lenses** in `gate:pass`.
  Non-trivial means any staged path under `scripts/`, `.opencode/`, `.github/`,
  `.githooks/`, `site/`, `evals/`, or `adapters/`; the root files `install.js`,
  `package.json`, `opencode.json`, `AGENTS.md`, or `.gitleaks.toml`; any
  `package-lock.json` at any depth; or more than 2 staged entries.
- The recorded pass is bound to the frozen snapshot (via its staged hash) and is
  consumed by the commit, so one approval cannot be reused.

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
