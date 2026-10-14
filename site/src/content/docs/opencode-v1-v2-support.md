---
title: OpenCode v1/v2 Support
description: How the pack supports OpenCode v1 and v2 targets - the target adapter, hybrid install model, plugin-spec option, and coexistence rules.
sidebar:
  order: 5
---

# OpenCode v1/v2 Support

The pack runs on OpenCode v1 today and is being prepared for OpenCode v2. v1 and
v2 use **disjoint config keys**, so a single config file cannot express both. The
installer generates per-target output instead of combining key sets.

## Target adapter

`install.js` accepts a `--target` flag:

| Value | Behavior |
|---|---|
| `v1` | Emit the v1 key set (`plugin`, `permission`). |
| `v2` | Emit the v2 key set (`permissions`; `plugins` only if the source config lists a plugin entry). |
| `auto` (default) | Detects the installed OpenCode version (v2 when the major is >= 2, else v1); falls back to v1 when OpenCode is not detected. An existing install keeps its recorded target. |

- An explicit `v1`/`v2` always wins.
- Under `auto`, an existing install keeps its recorded target, so an update never
  silently flips a v2 install back to v1.
- Under `auto`, the installer detects the installed OpenCode version via `opencode --version`:
  a major >= 2 selects `v2`, otherwise `v1`; when OpenCode is not detected it falls back to `v1`.
  Set `AGENTS_OPENCODE_HOST_VERSION` to override detection (used by tests and CI).
- The install manifest records `target`, so uninstall reverts the correct
  per-target keys.
- The two key sets are **never co-written** in one `opencode.json`.

```bash
npx agents-opencode --global --target v1    # plugin / permission
npx agents-opencode --global --target v2    # permissions (plugins only if a plugin entry exists)
npx agents-opencode --global --target auto  # detect the installed OpenCode version (v2 if major >= 2, else v1)
```

## v1 vs v2 key mapping

| Concern | v1 | v2 |
|---|---|---|
| Plugin config key | `plugin` | `plugins` |
| Permission key | `permission` (object) | `permissions` (array of `{ action, resource, effect }`) |
| Permission actions | `bash`, `task`, `write`/`patch`, plus `doom_loop`/`lsp` | `shell`, `subagent`, `edit`; `doom_loop`/`lsp` are not v2 actions |
| Command field | `subtask` | `subtask` is a deprecated alias for `subagent` |
| Agent config | top-level `temperature`, `permission` | `request.body`; no legacy top-level fields |
| Compaction | `compaction.prune` | `{ auto, keep, buffer }` |
| Plugin runtime | v1 hook function (named export) | default export `{ id, server, setup }` |

OpenCode v2 is documented to translate v1-shaped config, agents, and commands in
memory, so the adapter currently changes only the keys v2 does not translate.
**This auto-translation is the load-bearing assumption and is not yet verified
against a live v2 host** — v2's own agent docs recommend the new field shapes, so
confirm against a live v2 before relying on v2 agents/commands. The pack's plugin
targets **v2 core 2.0.4+** (it feature-detects the v2 skill-descriptor field,
preferring `path` and falling back to `location`).

## Hybrid install model

The pack installs in two cooperating layers:

- **Installer (file copy)** — delivers agent files, markdown commands, skills, and
  the `opencode.json` config/permissions.
- **Plugin** — when installed as a **plugin spec**, delivers skills plus the
  hooks/guards (secret-read blocking, compaction context, session-error logging).

A v2 plugin **cannot** register agents (the v2 agent editor exposes no `add`) and
has no global config/permission domain. The installer therefore remains required
for agents and global config on both targets.

## Install as a plugin spec

Add the package to your OpenCode config:

```json
{ "plugin": ["agents-opencode"] }
```

```json
{ "plugins": ["agents-opencode"] }
```

The first form is v1, the second v2. A version pin also works
(`"agents-opencode@2.6.0"`). A plugin-spec install covers **skills and
hooks/guards only** — not agents or global config.

**Experimental / unverified.** The plugin-spec runtime path has had no live
OpenCode v2 run yet, and the v2 plugin API is beta. Prefer a file install for
production use.

## Coexistence guard

Do **not** use the file install and the plugin spec at the same time. The plugin
detects the installer marker (`.opencode-agents-version` at the pack root) and
skips skill registration when the pack is file-installed, avoiding double
registration. It also de-duplicates against skills the runtime already exposes.

## Global config path and XDG

The global config directory honors `XDG_CONFIG_HOME`:

- If `XDG_CONFIG_HOME` is set to an **absolute** path, the global install lands at
  `$XDG_CONFIG_HOME/opencode`.
- An empty or **relative** value is ignored (per the XDG spec), falling back to
  `~/.config/opencode`.

If an install exists at the legacy path but not the resolved path (or vice versa),
the installer prints a split-brain warning. Re-run the global install to populate
the active path.

## v2 behavior notes

These v2 details matter when you target v2:

- **`request.body.temperature`** is preserved by v2 but **not yet sent** to the
  model — it is currently inert.
- **`compaction.prune`** is accepted by v2 but has **no runtime effect**.
- **`subtask`** on commands is a **deprecated alias** in v2; use `subagent`. v2
  docs conflict on whether the alias still delegates.
- Project `.opencode/skills/` is auto-discovered in v2.

## Enforcement

Run the fail-closed v2 conformance check:

```bash
npm run validate:opencode-schema:v2
```

`--v2-strict` validates the v2 target output (no v1-only keys, no co-written key
sets, v2 action allowlist) and scans agents and commands for untranslatable
tokens. CI runs it as its own job (`validate-opencode-schema-v2`).
