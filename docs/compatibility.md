---
layout: default
title: Compatibility
nav_order: 11
description: Runtime and tooling compatibility matrix for install and validation workflows.
---

# Compatibility Matrix

This matrix captures tested runtime/tooling targets for this repository.

## Runtime and CI Targets

| Surface | Target | Notes |
|---|---|---|
| Node.js (local validation scripts) | 24.x | Matches CI and publish workflows. |
| Node.js (CI validation) | 24.x | `validate.yml` jobs use Node 24. |
| npm publish runtime | 24.x | `publish.yml` uses Node 24 with trusted publishing. |
| Ruby (docs build) | 3.2 | Used by GitHub Pages workflow. |
| OS support for installer | Windows / Linux / macOS | Uses Node + filesystem APIs only. |

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
| Command docs parity validation | `npm run validate:commands` | `validate-command-matrices` |
| Agent eval harness | `npm run eval:agents` | `validate-agent-evals` |
| Risk-scored review path | _CI-driven_ | `validate-risk-path` |
| Docs internal links | `npm run validate:docs` | `validate-docs` |
| Docs external links (optional) | `npm run validate:docs:external` | `validate-external-links` (scheduled, non-blocking) |
| Tooling regression tests | `npm run doctor` | `validate-tooling-tests` |
| Context size check | `npm run validate:context` | `validate-context` |
| Markdown lint | `npm run lint:md` | `lint-markdown` |
| Workflow lint | _CI-only_ | `lint-workflows` |

`validate-risk-path` derives changed files from git context and, on pull requests,
checks that the PR template risk level acknowledges medium/high changes.
