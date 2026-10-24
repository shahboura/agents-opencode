# Deprecations

Retired agents, commands, skills, and contracts, with the replacement and rollback path.
Change levels follow [Deprecation & Migration Policy](./site/src/content/docs/deprecation-migration.md).

## 4.0.0 — retired skills

### Level C — `docs-validation`, `agent-diagnostics` (removed)

- **Removed:** the `docs-validation` and `agent-diagnostics` skills.
- **Version:** 4.0.0.
- **Why:** both restated commands the pack already ships, and both were maintainer-only —
  they described `npm run validate:docs` and `npm run doctor` rather than adding guidance,
  while costing a skill slot and catalog entry each.
- **Migrate:** run the command directly. There is no replacement skill.
  - `docs-validation` → `npm run validate:docs` (add `:external` for external links)
  - `agent-diagnostics` → `npm run doctor`, or `node scripts/validate-agents.js` for
    agent config and instruction coverage only
- **Rollback:** reinstall the previous version (`npx agents-opencode@<previous>`), which
  restores both skills. Nothing else in the pack depends on them.

Manifests that allowlisted these skills by name (`permission.skill`) should drop the stale
keys; an allowlist entry for a skill that no longer ships is inert, not an error.
