# Backlog

Deferred work from review cycles and the OpenCode v2 readiness assessment. Update
this file when items land or new gaps are found. Last updated: 2026-09-29.

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

## Docs hosting migration

Note: GitHub Pages is **not** deprecated (verified 2026-09-29) — this was an optional
convenience move, not a correctness fix. Landed on `feat/docs-astro-cloudflare`.

| ID | Severity | Item | Files |
|---|---|---|---|
| DOCS-1 | low | Done: docs site moved to Astro Starlight (`site/`) on Cloudflare **Workers Static Assets**; Jekyll (`docs/`) and the Pages workflow removed; deploy via `deploy-docs.yml` + `site/wrangler.jsonc`. Old-URL redirects still to plan before launch. | `.github/workflows/deploy-docs.yml`, `site/wrangler.jsonc`, `README.md`, `package.json` |
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
| Commands | `subtask` | `subagent` (`subtask` deprecated alias) |
| Agents | top-level `temperature`, `permission` | `request.body`; no legacy top-level fields |
| Actions | `doom_loop`, `lsp` | not v2 actions |
| Compaction | `compaction.prune` | `{ auto, keep, buffer }` |
| Plugin runtime | v1 hook objects | `Plugin.define({ setup })` — v1 plugins do not run in v2 |

Phases:

1. Phase 0 (2.x, non-breaking): dual-entrypoint plugin (v1 `server()` plus v2
   `Plugin.define({ setup })`); installer `--target v1|v2|auto`; a target-adapter
   module that emits config and agent frontmatter per target; `--v2-strict`
   validation in a CI matrix; v1/v2 compatibility docs.
2. Phase 1 (2.x, compatibility window): auto-select v2 when detected; add install
   end-to-end tests for both targets.
3. Phase 2 (3.0.0, breaking): stop emitting v1 keys and remove the v1 plugin branch.

Guardrails:

- Never dual-write `permission` and `permissions` in one file; generate per target.
- Preserve secret-read protection in the ported plugin hook (v2 only `ask`s on `*.env`).
- Keep `AGENTS.md` as the instruction mechanism (v2 ignores the `instructions` config).
- Support both through 2.x; reserve the major release for dropping v1.

## Provenance

- Validator schema audit and multi-lens review cycles (2026-09-28).
- Independent OpenCode v1/v2 standards research (2026-09-28).
- `site/src/content/docs/deprecation-migration.md` defines the Level A/B/C change policy referenced above.
