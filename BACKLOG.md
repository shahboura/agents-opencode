# Backlog

Deferred work from review cycles and the OpenCode v2 readiness assessment. Update
this file when items land or new gaps are found. Last updated: 2026-10-15.

## Validation hardening

The validator review cycles produced these items. VAL-1 and VAL-3 landed in the
`chore/validator-hardening` change; VAL-2 was reverted after review.

| ID | Severity | Item | Files |
|---|---|---|---|
| VAL-1 | low | Done: `validate-agents.js` skill/task allowlist parsing migrated to shared, indentation-safe helpers | `scripts/validate-agents.js`, `scripts/lib/opencode-schema.js` |
| VAL-2 | low | Reverted: CI keeps `setup-go` on `stable` (floating toolchain accepted); pin only if reproducible builds are required | `.github/workflows/validate.yml` |
| VAL-3 | low | Done: regression tests for quoted vs indented frontmatter keys | `scripts/validate-opencode-schema.test.js` |
| VAL-4 | info | Migrate remaining hand-rolled frontmatter/permission parsers to the shared module | `evals/harness/run-evals.js`, `scripts/validate-command-matrices.js` |

## Review-gate patterns

| ID | Severity | Item | Files |
|---|---|---|---|
| GATE-1 | medium | Add effort-scaling delegation budgets (scale subagent/tool budget to task complexity) | `.opencode/agents/orchestrator.md`, `.opencode/instructions/orchestrator-reference.instructions.md` |
| GATE-2 | low | Add a voting/redundancy pass to the multi-lens review gate for high-risk diffs | `.opencode/instructions/orchestrator-reference.instructions.md`, `.opencode/agents/review.md` |

## Skills

| ID | Severity | Item | Files |
|---|---|---|---|
| SKILL-1 | low | Ship deterministic `scripts/` for operational skills | `.opencode/skills/docs-validation`, `.opencode/skills/code-change-impact` |
| SKILL-2 | low | Behavioral eval coverage for the ported discipline skills (`systematic-debugging`, `test-driven-development`, `verification-before-completion`). The eval harness (`evals/harness/run-evals.js`) is **static-contract only** and cannot exercise agent defaults. Options: (a) add static skill contracts (Iron Law markers + `## Provenance` present, `references/*` links resolve) as a drift guard, or (b) add a behavioral drill harness (e.g. adapt the upstream pressure-test prompts). | `evals/harness/run-evals.js`, `evals/fixtures/expected-contracts.json` |

## Docs hosting migration

Note: GitHub Pages is **not** deprecated (verified 2026-09-29) — this was an optional
convenience move, not a correctness fix. Landed on `feat/docs-astro-cloudflare`.

| ID | Severity | Item | Files |
|---|---|---|---|
| DOCS-1 | low | Done: docs site moved to Astro Starlight (`site/`) on Cloudflare **Workers Static Assets**; Jekyll (`docs/`) and the Pages workflow removed; deploy via `deploy-docs.yml` + `site/wrangler.jsonc`. Docs origin: <https://agnts.elkodr.com/> (Worker custom domain). Old-URL redirects remain optional (none ship by default). | `.github/workflows/deploy-docs.yml`, `site/wrangler.jsonc`, `README.md`, `package.json` |
| DOCS-2 | low | Done: docs-site artifacts excluded from the published npm package (root `files` allowlist omits `site/`; asserted via `npm pack --dry-run` in `scripts/test-npx-integrity.js`). | `package.json` (`files`), `scripts/test-npx-integrity.js` |

**Decommission checklist (GitHub Pages → Cloudflare Workers):**

- Disable GitHub Pages in repo settings: **Settings → Pages → Source: None**.
  This removes the old `shahboura.github.io/agents-opencode/*` site.
- Once Pages is disabled, old `shahboura.github.io/agents-opencode/*` URLs will
  **404 with no redirect**. Mapping those paths to the new Worker origin with
  Cloudflare redirect rules is the optional follow-up (no redirects ship by
  default).

## OpenCode v2 migration plan

The package targets OpenCode v1 today. v1 and v2 keys are disjoint, so a single
static file cannot express both. Generate per target instead of concatenating.

| Concern | v1 | v2 |
|---|---|---|
| Permissions | `permission` object | `permissions` array (`shell` / `subagent` actions) |
| Plugin config | `plugin` | `plugins` |
| Commands | `subtask` | `subagent` (`subtask` deprecated alias; v2 docs conflict on whether it still delegates) |
| Agents | top-level `temperature`, `permission` | `request.body` — accepted, but `request.body.temperature` is **inert** (preserved, not yet sent to the model) |
| Actions | `doom_loop`, `lsp` | not v2 actions |
| Compaction | `compaction.prune` | `{ auto, keep, buffer }`; `compaction.prune` is accepted by v2 but has **no runtime effect** |
| Plugin runtime | v1 hook object (named export) | default export `{ id, setup }`; v1 plugins do not run in v2 |
| Skills | `.opencode/skills/` copied by the installer | project `.opencode/skills/` auto-discovered (v2 core 2.0.4+) |

Phases:

1. Phase 0 (2.x, non-breaking) — **shipped in the dual-support upgrade**:
   - Installer target adapter `--target v1|v2|auto` (default `auto`); v1 emits
     `plugin`/`permission`, v2 emits `plugins`/`permissions`; the two key sets are
     never co-written; the manifest records `target` and uninstall reverts the
     correct per-target keys.
   - Dual-entrypoint plugin (v1 named export plus v2 default `{ id, setup }`).
   - Plugin-spec entrypoint (delivers skills plus hooks/guards only) with the
     installer-marker coexistence guard (`.opencode-agents-version`).
   - XDG fix: global config dir honors `XDG_CONFIG_HOME` (absolute only) with a
     split-brain warning.
   - `--v2-strict` is now a real, fail-closed validator
     (`npm run validate:opencode-schema:v2`, its own CI job); the old
     `install.js --v2-strict` no-op stub was removed.
   - v1/v2 compatibility docs.
2. Phase 1 (2.x, compatibility window): **partly shipped** — `--target auto` now
   detects the installed OpenCode version (`opencode --version`; major >= 2 selects
   v2, else v1; `AGENTS_OPENCODE_HOST_VERSION` overrides detection) and install
   end-to-end tests cover both targets. **Remaining:** live v2 validation — no
   OpenCode v2 run has exercised the plugin-spec path yet (the v2 plugin API is
   beta), so treat plugin-spec as experimental.
3. Phase 2 (3.0.0, breaking): stop emitting v1 keys and remove the v1 plugin branch.

Guardrails:

- Never dual-write `permission` and `permissions` in one file; generate per target.
- Preserve secret-read protection in the ported plugin hook (v2 only `ask`s on `*.env`).
- Keep `AGENTS.md` as the instruction mechanism (v2 ignores the `instructions` config).
- Support both through 2.x; reserve the major release for dropping v1.

## UI/UX skill integration (shipped: external delegation)

Evaluated embedding [`nextlevelbuilder/ui-ux-pro-max-skill`](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
(MIT) for richer UI/UX guidance. **Decision: external install + in-skill delegation** — the pack
does not vendor the skill (a Python-3 search engine plus a ~3 MB CSV/JSON data subtree) and takes
no runtime dependency on it.

Shipped approach:

- `ux-responsive` carries a short delegation section: prefer the externally installed
  `ui-ux-pro-max` search script when present, fall back to its own rules otherwise, and surface a
  pinned install command (`npx ui-ux-pro-max-cli@2.15.0 init --ai opencode`).
- No new skill, no vendored data/scripts, no `package.json` dependency, and no path collision with
  the user's own `.opencode/skills/ui-ux-pro-max/` install.

Rejected: hybrid (embed data/scripts) and full vendor — both add a Python dependency, tarball
size, upstream drift, and attribution surface for no benefit over delegation.

| ID | Severity | Item | Files |
|---|---|---|---|
| UIUX-1 | low | Done: external-install delegation documented in `ux-responsive` (no vendoring) | `.opencode/skills/ux-responsive/SKILL.md` |

## Provenance

- Validator schema audit and multi-lens review cycles (2026-09-28).
- Independent OpenCode v1/v2 standards research (2026-09-28).
- `site/src/content/docs/deprecation-migration.md` defines the Level A/B/C change policy referenced above.
