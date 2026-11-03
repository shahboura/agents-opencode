# Deprecations

## 4.x — retired plugin-spec installs

Adding the package as an OpenCode plugin entry (`"plugin": ["agents-opencode"]` on v1,
`"plugins": ["agents-opencode"]` on v2) is retired (Level B). An existing entry still
resolves in 4.x: it loads the secret-read guard and the context block (untrusted-memory
rule, plus a state pointer when the project has `state/session-state.json`) and logs a
warning, but delivers no agents, commands, or skills.

- **Migrate:** run `npx agents-opencode --global` or `npx agents-opencode --project .`.
  The installer strips the plugin entry and copies the bundled plugin, so the guard remains.
- **Removal:** 5.0 removes the package entrypoint; the plugin entry stops resolving.

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
