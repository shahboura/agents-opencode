---
title: Compatibility
description: Runtime and tooling compatibility matrix for install and validation workflows.
sidebar:
  order: 11
---

# Compatibility Matrix

This matrix captures tested runtime/tooling targets for this repository.

## Runtime and CI Targets

| Surface | Target | Notes |
|---|---|---|
| Node.js (local validation scripts) | 24.x | Matches CI and publish workflows. |
| Node.js (CI validation) | 24.x | `validate.yml` jobs use Node 24. |
| npm publish runtime | 24.x | `publish.yml` uses Node 24 with trusted publishing. |
| Node.js (docs build) | 24.x | Astro Starlight build, deployed by the Cloudflare Workers workflow. |
| OS support for installer | Windows / Linux / macOS | Uses Node + filesystem APIs only. |

## OpenCode v1 and v2 Targets

The pack fully supports OpenCode v1 and prepares v2 support; the two use
**disjoint config keys**. The installer emits per-target output
(`--target v1|v2|auto`; `auto` resolves to v1 today) and never co-writes both key
sets. The **v2 runtime path is experimental** — the plugin-spec path and the
reliance on v2 translating v1-shaped agent/command files are not yet verified
against a live v2 host (see [OpenCode v1/v2 support](/opencode-v1-v2-support/)).

| Concern | v1 | v2 |
|---|---|---|
| Plugin config key | `plugin` | `plugins` |
| Permission key | `permission` (object) | `permissions` (array of `{ action, resource, effect }`) |
| Action names | `bash`, `task`, `write`/`patch` | `shell`, `subagent`, `edit` |
| Command field | `subtask` | `subtask` deprecated alias for `subagent` |
| Agent config | top-level `temperature`, `permission` | `request.body` |

The global config directory honors `XDG_CONFIG_HOME` (absolute values only),
falling back to `~/.config/opencode`.

See **[OpenCode v1/v2 Support](/opencode-v1-v2-support/)** for the full target
adapter, hybrid install model, and coexistence rules.

## Expected Tooling Availability

| Tool | Required for | Notes |
|---|---|---|
| `node` + `npm` | Install, update, validate scripts | Required locally and in CI. |
| `opencode` CLI | Runtime use of installed agents | Not required to run repository validators. |
| `git` | Typical development workflows | Required for contribution workflows. |

## Validation Baseline

For local parity with CI, run:

```bash
npm run doctor
```

If you run external link checks locally, prefer:

```bash
npm run validate:docs:external
```

External checks are also executed by a scheduled non-blocking workflow.

## Validation Checks Matrix

| Check | Local command | CI gate |
|---|---|---|
| Agent configuration validation | `npm run validate:agents` | `validate-agents` |
| OpenCode schema conformance | `npm run validate:opencode-schema` | `validate-opencode-schema` |
| OpenCode v2-strict conformance | `npm run validate:opencode-schema:v2` | `validate-opencode-schema-v2` |
| Command docs parity validation | `npm run validate:commands` | `validate-command-matrices` |
| Agent eval harness | `npm run eval:agents` | `validate-agent-evals` |
| Agent eval trend snapshot | `npm run eval:agents:json` + `npm run eval:agents:trend` | `validate-agent-evals` (artifact upload) |
| Risk-scored review path (advisory) | _CI-driven_ | `validate-risk-path` |
| Docs internal links | `npm run validate:docs` | `validate-docs` |
| Changelog capability labels | `npm run validate:changelog` | `validate-changelog` |
| Session state contract | `npm run validate:session` | `validate-session-state` |
| Plugin guard tests | `npm run validate:plugin-guards` | `validate-tooling-tests` |
| Docs external links (optional) | `npm run validate:docs:external` | `validate-external-links` (scheduled, non-blocking) |
| Tooling regression tests | `npm run doctor` | `validate-tooling-tests` |
| Context size check | `npm run validate:context` | `validate-context` |
| Markdown lint | `npm run lint:md` | `lint-markdown` |
| Workflow lint | _CI-only_ | `lint-workflows` |

`validate-risk-path` derives changed files from git context and reports a computed
risk level plus whether the PR template acknowledges it. The check is **advisory**
and does not block merges.
