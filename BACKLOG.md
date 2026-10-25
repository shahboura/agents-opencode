# Backlog

Deferred work from review cycles and the OpenCode v2 readiness assessment. Update
this file when items land or new gaps are found. Last updated: 2026-10-25.

## Evals

| ID | Severity | Item | Files |
|---|---|---|---|
| EVAL-2 | medium | Partial: task set, drill runner, decision record, and eval notes are removed from `/work` and `/pack` (the static harness and fixtures stay so `npm run doctor` works); post-run `git status --ignored` + baseline diff go to `<out>.artifacts.patch`, including redacted runs. Remaining: version prompts with their fixtures before the next screening | `evals/harness/`, `evals/drills/` |
| EVAL-3 | low | Add efficiency metrics to the drill runner: wall-clock duration and tool-call count per run; tokens only when the host exposes usage. Correctness alone cannot justify the harness cost | `evals/harness/`, `evals/decision.md` |
| EVAL-4 | low | D03 prompt corrected to `--csv`; re-run pending with the next screening | `evals/drills/tasks.md` |

## Validation hardening

The validator review cycles produced these items. VAL-1 and VAL-3 landed in the
`chore/validator-hardening` change; VAL-2 was reverted after review.

| ID | Severity | Item | Files |
|---|---|---|---|
| VAL-1 | low | Done: `validate-agents.js` skill/task allowlist parsing migrated to shared, indentation-safe helpers | `scripts/validate-agents.js`, `scripts/lib/opencode-schema.js` |
| VAL-2 | low | Reverted: CI keeps `setup-go` on `stable` (floating toolchain accepted); pin only if reproducible builds are required | `.github/workflows/validate.yml` |
| VAL-3 | low | Done: regression tests for quoted vs indented frontmatter keys | `scripts/validate-opencode-schema.test.js` |
| VAL-4 | info | Migrate remaining hand-rolled frontmatter/permission parsers to the shared module. Follow-up: `extractNestedBlock` still requires exactly 2-space indentation (silent skip for 4-space agents); fold into this migration | `evals/harness/run-evals.js`, `scripts/validate-command-matrices.js` |
| VAL-5 | info | Optional typo hint: warn when a skill allow entry is within a small edit distance of a pack skill (restores fail-closed value for `pythonn`-style typos); also align the evals harness (errors on unknown allow names under a deny baseline) with the agent validator's warning stance | `scripts/validate-agents.js`, `evals/harness/run-evals.js` |
| VAL-6 | low | Regression test for the drill capture path: build a temp repo, plant `core.fsmonitor`, a `hooks/post-index-change`, and a replaced `.git`, run the capture calls, and assert no marker file is written and the patch is non-empty. Today only `bash -n` covers it | `evals/harness/run-drill.sh`, `scripts/doctor.js` |

## Host-coexistence follow-ups

| ID | Severity | Item | Files |
|---|---|---|---|
| HOST-1 | low | Upgrade cleanup: recognize prior installer-shaped `external_directory: "deny"` values so the stale key is cleaned on upgrade or target switch | `install.js`, `scripts/lib/config-mutator.js` |
| HOST-2 | low | Extend the installer `--languages` flag to also prune non-selected test-runner allow lines from the three shell-allowlist agents (install-time frontmatter transform), so the permission bundle is proportional to the selected languages; unused runners are inert until then | `install.js`, `scripts/lib/file-ops.js`, `.opencode/agents/{codebase,orchestrator,em-advisor}.md` |

## Permission model follow-ups

Deferred from the permission/skill documentation pass (2026-10).

| ID | Severity | Item | Files |
|---|---|---|---|
| PERM-1 | medium | Live-host v2 resolved-rule test in CI: run `opencode debug agents` against a pinned v2 host and assert the pack's resolved rules (`bash`→`shell`, `task`→`subagent`, `edit`), catching translation drift that static validators cannot see | `.github/workflows/validate.yml`, `scripts/` |
| PERM-2 | low | Saved-approval overlay test: confirm a project-scoped **Allow always** rule (for example `edit *`) overrides `edit: "ask"` but never a configured `deny`, so the documented behavior stays regression-guarded | `scripts/`, `site/src/content/docs/customization.md` |
| PERM-3 | low | Headless profile (deferred): a minimal agent/allowlist set for non-interactive runs, where `ask` is unusable and saved approvals do not exist | `.opencode/agents/`, `install.js` |
| PERM-4 | low | Prune agent/skill duplication: rules restated in both agent instructions and skills inflate context and drift; keep one canonical home per rule | `.opencode/agents/`, `.opencode/skills/` |
| PERM-5 | medium | Shell secret reads under `--auto`: the guard now blocks direct read/copy forms, including wrappers (`sudo`, `bash -c`, quoted compounds), absolute paths, `<` redirection (quoted targets included), globs, `dd if=`, `cp`/`mv` target-directory forms, direct interpreter references (`python -c`, versioned names, heredocs naming the path) and simple `$(cat …)` substitutions. Mixed quoted/unquoted redirect targets, encoded/computed paths, quoted backticks, obfuscated interpreter names, other interpreters (`php`, `lua`), and aliases still bypass; only a sandbox closes those. Keep the limitation documented | `.opencode/lib/guards.mjs`, `evals/headless.md` |

## Review-gate patterns

| ID | Severity | Item | Files |
|---|---|---|---|
| GATE-1 | medium | Done: effort-scaling delegation budgets (implementers, lenses, cycles) added to the orchestrator and reference | `.opencode/agents/orchestrator.md`, `.opencode/instructions/orchestrator-reference.instructions.md` |
| GATE-2 | low | Add a voting/redundancy pass to the multi-lens review gate for high-risk diffs | `.opencode/instructions/orchestrator-reference.instructions.md`, `.opencode/agents/review.md` |
| GATE-3 | medium | Make the gate receipt informative: record per-lens outcomes (verdict + findings raised / fixed) in `.gate/pass.json`, not just lens names, so a rigorous panel (`2 lenses, 9 findings, 6 fixed`) is distinguishable from a rubber stamp (`2 lenses, 0 findings`). Today both receipts look identical, and the marker is self-attested — this is the cheapest step toward a self-policing gate. | `scripts/gate/record-pass.js`, `scripts/gate/lib.js`, `.githooks/pre-commit`, `site/src/content/docs/review-gate.md`, `CONTRIBUTING.md` |
| GATE-4 | low | Track the ritual signal: report when markers routinely record 0 findings (or repeated single-lens trivial passes on non-trivial diffs), so degradation into box-ticking is visible before it becomes habit. Pairs with GATE-3. | `scripts/gate/record-pass.js` (+ a small report script), `scripts/doctor.js` |
| GATE-5 | low | Shift the deterministic Tier 1 checks fully into CI (branch protection), keeping the local gate only for the Tier 2 lens panel — the one part CI cannot run. Removes the "Tier 1 marker" ceremony entirely. | `.github/workflows/validate.yml`, `site/src/content/docs/review-gate.md`, `CONTRIBUTING.md` |

## Skills

| ID | Severity | Item | Files |
|---|---|---|---|
| SKILL-1 | low | Ship deterministic `scripts/` for operational skills | `.opencode/skills/code-change-impact` |
| SKILL-2 | low | Behavioral eval coverage for the ported discipline skills (`systematic-debugging`, `test-driven-development`, `verification-before-completion`). The eval harness (`evals/harness/run-evals.js`) is **static-contract only** and cannot exercise agent defaults. Options: (a) add static skill contracts (Iron Law markers + `## Provenance` present, `references/*` links resolve) as a drift guard, or (b) add a behavioral drill harness (e.g. adapt the upstream pressure-test prompts). | `evals/harness/run-evals.js`, `evals/fixtures/expected-contracts.json` |
| SKILL-3 | low | Split test files above ~600 lines: `gate.test.js` (1,074), `test-installer.js` (1,211), `plugin-v2.test.js` (806) | `scripts/gate/gate.test.js`, `scripts/test-installer.js`, `scripts/plugin-v2.test.js` |
| SKILL-4 | low | Trim skill descriptions back under 409 words (427 after adding `alignment` and `writing-for-agents`) | `.opencode/skills/*/SKILL.md` |

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

## Docs freshness/UX follow-ups (deferred)

Deferred from the docs freshness/UX review pass (`docs/freshness-ux-pass`) so the
deferral is explicit and traceable.

| ID | Severity | Item | Files |
|---|---|---|---|
| F5 | low | Convert prose to Starlight components (asides, `<Steps>`, `<LinkCard>`) where they improve scanning | `site/src/content/docs/**/*.md` |
| F10 | low | Site-wide heading capitalization sweep for consistent heading case | `site/src/content/docs/**/*.md` |

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
| Skills | `.opencode/skills/` copied by the installer | project `.opencode/skills/` auto-discovered natively (confirmed on v2.0.30) |

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
2. Phase 1 (2.x, compatibility window): **partly shipped** — `--target auto` detects
   the installed OpenCode version; install e2e tests cover both targets; a disposable
   sandbox run against **OpenCode v2.0.30** confirmed the plugin loads and all 10 agents
   are discovered. **Remaining:** exercise v2 runtime hook behaviour with a model
   (secret-read guard, context injection, event subscription) and the plugin-spec skill
   delivery end-to-end.
3. Phase 2 (future major, breaking): stop emitting v1 keys and remove the v1 plugin branch.
4. Host coexistence (shipped): pack agents allow all skills (`"*": "allow"`) so host
   skills stay usable; shell allowlists cover read-only diagnostics and test runners;
   `external_directory` is `ask`; the source config uses `experimental.subagent_depth`
   and `compaction.keep.tokens`; v2 conformance rejects only v1-only action names and
   accepts plugin-defined actions. **Deferred:** native `--v2-native` agent rewriting —
   converting the shared agent files to `permissions` arrays would break v1 hosts unless
   the installer transforms per target.

Guardrails:

- Never dual-write `permission` and `permissions` in one file; generate per target.
- Preserve secret-read protection in the ported plugin hook (v2 only `ask`s on `*.env`).
- Keep `AGENTS.md` as the instruction mechanism (v2 ignores the `instructions` config).
- Support both until a future breaking major; reserve the major release for dropping v1.

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
