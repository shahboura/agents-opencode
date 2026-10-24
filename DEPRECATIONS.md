# Deprecations

## 4.0.0 — removed `docs-validation` and `agent-diagnostics`

Both skills were removed in **4.0.0** (Level C, breaking). Each restated commands the
pack already ships, and both were maintainer-only.

- **Migrate:** `npm run validate:docs` for link/docs checks, `npm run doctor` for
  agent/config validation, or `node scripts/validate-agents.js` for the narrow case.
- **Existing installs:** the installer prunes manifest-recorded skill directories that no
  longer ship, after a complete backup. A failed backup keeps the directory, warns, and
  leaves it unmanaged.
- **Rollback:** reinstall 3.1.x, or restore the two directories from its package into
  `.opencode/skills/` (or the global config skills dir).
- **Why a major:** removing installed skills is a breaking change; 4.0.0 is the version
  that carries it.
