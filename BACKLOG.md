# Backlog

Deferred work is tracked as GitHub issues. This file is the index plus the one plan
that does not fit a single issue. Last updated: 2026-11-01.

## Index

### P1 - security, or a shipped guarantee with no test

| ID | Issue | Item |
|---|---|---|
| PERM-5 | [#141](https://github.com/shahboura/agents-opencode/issues/141) | Shell secret-read guard residuals |
| PERM-1 | [#142](https://github.com/shahboura/agents-opencode/issues/142) | Live-host v2 resolved-rule CI test |
| VAL-6 | [#143](https://github.com/shahboura/agents-opencode/issues/143) | Drill capture-hardening regression test |
| GATE-3 | [#144](https://github.com/shahboura/agents-opencode/issues/144) | Per-lens findings in the gate receipt |
| PUB | [#165](https://github.com/shahboura/agents-opencode/issues/165) | Publication stream: metadata, trust, listing PRs (next stream) |

### P2 - drift and documented-behaviour guards

| ID | Issue | Item |
|---|---|---|
| EVAL-2 | [#145](https://github.com/shahboura/agents-opencode/issues/145) | Version eval prompts with their fixtures |
| VAL-4 | [#146](https://github.com/shahboura/agents-opencode/issues/146) | Evals harness -> shared frontmatter parser |
| PERM-2 | [#147](https://github.com/shahboura/agents-opencode/issues/147) | Saved-approval overlay precedence test |
| HOST-2 | [#148](https://github.com/shahboura/agents-opencode/issues/148) | Prune non-selected test-runner allows |
| SKILL-2 | [#149](https://github.com/shahboura/agents-opencode/issues/149) | Eval coverage for the discipline skills |

### P3 - polish, cleanup, docs

| ID | Issue | Item |
|---|---|---|
| HOST-1 | [#150](https://github.com/shahboura/agents-opencode/issues/150) | External_directory upgrade cleanup |
| PERM-3 | [#151](https://github.com/shahboura/agents-opencode/issues/151) | Headless permission profile |
| PERM-4 | [#152](https://github.com/shahboura/agents-opencode/issues/152) | Remove agent/skill rule duplication |
| GATE-2 | [#153](https://github.com/shahboura/agents-opencode/issues/153) | Voting pass for high-risk diffs |
| GATE-4 | [#154](https://github.com/shahboura/agents-opencode/issues/154) | Report the gate ritual signal |
| GATE-5 | [#155](https://github.com/shahboura/agents-opencode/issues/155) | Tier 1 checks into CI branch protection |
| EVAL-3 | [#156](https://github.com/shahboura/agents-opencode/issues/156) | Tool-call count in drill metrics |
| EVAL-4 | [#157](https://github.com/shahboura/agents-opencode/issues/157) | Re-run drill D03 with the next screening |
| VAL-5 | [#158](https://github.com/shahboura/agents-opencode/issues/158) | Near-miss skill allow names |
| SKILL-1 | [#159](https://github.com/shahboura/agents-opencode/issues/159) | Scripts for `code-change-impact` |
| SKILL-3 | [#160](https://github.com/shahboura/agents-opencode/issues/160) | Split test files above ~600 lines |
| SKILL-4 | [#161](https://github.com/shahboura/agents-opencode/issues/161) | Trim skill descriptions under 409 words |
| F5 | [#162](https://github.com/shahboura/agents-opencode/issues/162) | Starlight components |
| F10 | [#163](https://github.com/shahboura/agents-opencode/issues/163) | Heading capitalization sweep |
| DOCS | [#164](https://github.com/shahboura/agents-opencode/issues/164) | Decommission GitHub Pages |

Closed out of this file on 2026-11-01 (landed): VAL-1, VAL-3, GATE-1, DOCS-1,
DOCS-2, UIUX-1. VAL-2 is a decision, not work: CI keeps Go on `stable`.

## OpenCode v1/v2 migration plan

The package ships a v1-shaped config; the installer emits v1 or v2 keys per target
(`--target auto`, the default, detects the host). The key sets are disjoint, so it
generates per target instead of concatenating.

| Concern | v1 | v2 |
|---|---|---|
| Permissions | `permission` object | `permissions` array (`shell` / `subagent` actions) |
| Plugin config | `plugin` | `plugins` |
| Commands | `subtask` | `subagent` (`subtask` deprecated alias; v2 docs conflict on whether it still delegates) |
| Agents | top-level `temperature`, `permission` | `request.body` (`temperature` inert) |
| Actions | `doom_loop`, `lsp` | not v2 actions |
| Compaction | `compaction.prune` | `{ auto, keep, buffer }`; `prune` has no runtime effect |
| Plugin runtime | v1 hook object (named export) | default export `{ id, server, setup }`; v1 plugins do not run in v2 |
| Skills | `.opencode/skills/` copied by the installer | auto-discovered natively (confirmed on v2.0.30) |

Phases:

1. Phase 0 (shipped) - `--target v1|v2|auto` adapter, dual-entrypoint plugin,
   plugin-spec entrypoint with the installer-marker guard (retired in 4.x; the entry still
   resolves for the guard), XDG fix, `--v2-strict` validator, v1/v2 docs.
2. Phase 1 (partly shipped) - auto-detect, install e2e for both targets, sandbox run
   against v2.0.30 confirmed plugin load plus 10 agents. **Remaining exit gate:** a
   live-model v2 run exercising the secret-read guard and the trimmed two-line context
   block. Event subscription and plugin-spec skill delivery were removed with those hooks;
   plugin-spec installs are retired.
3. Phase 2 (future major) - stop emitting v1 keys, drop the v1 plugin branch.
4. Host coexistence (shipped) - skills `"*": allow`, shell allowlists, `external_directory: ask`,
   `experimental.subagent_depth`, `compaction.keep.tokens`. **Deferred:** native
   `--v2-native` agent rewriting, which needs an installer transform to keep v1 hosts working.

Guardrails: never dual-write `permission` and `permissions`; keep secret-read protection
in the ported hook (v2 only *asks* on `*.env`); keep `AGENTS.md` as the instruction
mechanism (v2 ignores the `instructions` config); reserve the major release for dropping v1.

## Provenance

- Validator schema audit and multi-lens review cycles (2026-09-28).
- OpenCode v1/v2 standards research and the v2.0.30 sandbox run.
- `site/src/content/docs/deprecation-migration.md` defines the Level A/B/C change policy.
