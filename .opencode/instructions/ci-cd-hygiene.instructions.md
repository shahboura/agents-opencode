---
description: CI/CD hygiene, validation gates, and security checks
applyTo: '.github/workflows/**/*.{yml,yaml}'
---

# CI/CD Hygiene Instructions

## Pipelines
- Fail fast: run lint/format/test/type-check gates before deploy stages.
- Use `npm ci`/`pip install --no-deps -r requirements.txt`/`dotnet restore` as appropriate; avoid floating deps.
- Cache dependencies with keys that include lockfiles; restore before install.
- Separate build, test, and deploy jobs; reuse artifacts instead of rebuilding.

## Security
- Never expose secrets in logs; use GitHub secrets and envs.
- Add a secrets scan step if available (e.g., trufflehog/gitleaks) for critical repos.
- Pin third-party actions by tag/sha; prefer official maintained actions.

## Quality Gates
- Include lint/format checks (ESLint/black/ruff/gofmt/golint/etc.) and tests.
- For typed languages, run type checks (`tsc --noEmit`, `mypy`, `dotnet build` with warnings as errors where feasible).
- Enforce status checks on protected branches.

## Reliability
- Use concurrency/cancel-in-progress for long-running workflows to avoid queue pileups.
- Set timeouts on steps/jobs to prevent hangs.
- For deployments, require manual approvals where needed and run canary/health checks.

## Observability
- Surface test summaries and coverage where possible.
- Emit artifact checksums for released bundles/images.

## Validation Commands
- N/A (applied via workflow steps). Ensure workflows include appropriate lint/test/build/security steps for the stack.
