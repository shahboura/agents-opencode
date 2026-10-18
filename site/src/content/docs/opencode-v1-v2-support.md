---
title: OpenCode v1/v2 Support
description: How the pack supports OpenCode v1 and v2 targets - the target adapter, hybrid install model, plugin-spec option, and coexistence rules.
sidebar:
  order: 11.5
---

The pack supports OpenCode v1 and v2 from one source: v1-shaped files are
auto-translated by v2 in memory, and the installer emits per-target config.

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

## Permission shape on v2

Agent frontmatter stays v1-shaped (`permission:` maps, top-level `temperature`). V2
translates it in memory; the migration guide calls conversion optional. The resolved
rules were verified on **OpenCode 2.0.32** with `opencode debug agents`:

- `bash` → `shell`, `task` → `subagent`, `write`/`patch` → `edit`
- string decisions become `{ action, resource: "*", effect }`
- nested command patterns keep their order (last match wins; verified on 2.0.32 — the
  resolved array keeps source order)
- global config rules precede agent rules, and agent rules are appended last; a global
  permission rule cannot override a pack agent's own rule
- `skill` is a real v2 action; pack agents use `"*": "allow"` so host skills stay usable.
  Skills are instructions, not tools, so treat project-local skills in untrusted clones as
  untrusted content (or hard-deny with a v2 `integration.use` policy)
- `doom_loop` is not a v2 action; the installer drops it for v2 and keeps it for v1
- unknown/plugin-defined actions (for example `browser`) pass conformance because V2
  action names are strings and plugins may define more

Native `permissions` arrays are optional. Converting the agent files would break v1
hosts, which ignore the unknown key and fall back to default-allow, so the pack keeps
the v1-shaped source and translates per target.

OpenCode v2 translates v1-shaped config, agents, and commands in memory — the
migrate-v1 guide states "V2 translates legacy agent frontmatter automatically" — and a
disposable sandbox run against **v2.0.30** confirmed the pack's 10 agents are discovered
from v1-shaped frontmatter, while **2.0.32** confirmed the resolved permission rules.
The adapter still changes only the keys v2 does not translate. The plugin is written
against the published **v2.0.30** plugin API and verified to load on that host; runtime
hook behaviour (secret-read guard, context injection, event subscription) has not yet
been exercised with a model. The skill descriptor uses `path`, v2's only file field.

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
(`"agents-opencode@X.Y.Z"`, using a build that ships plugin-spec support). A
plugin-spec install covers **skills and hooks/guards only** — not agents or global
config.

**Verified loading, unexercised runtime.** A live OpenCode **v2.0.30** run confirmed the
plugin loads, and all 10 agents and 27 skills are discovered; **2.0.32** confirmed the
translated agent permission rules. The v2 plugin API is still evolving, and runtime hook
behaviour and plugin-spec skill delivery have not been exercised with a model — prefer a
file install for production use.

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
- **`doom_loop`** is not a v2 permission action. The pack keeps it in v1 target
  config and drops it from v2 target output; a v1-shaped file loaded directly by
  v2 resolves it as an inert action.
- **`external_directory`** is allowed by default in v2 (v1 asks). The pack sets
  it to `ask` so interactive clients prompt before cross-directory access;
  `--auto` auto-approves asks, so use `deny` + explicit allows there.
- **`compaction.prune`** has no v2 effect; the pack's source config uses
  `compaction.keep.tokens` instead.
- **Top-level `subagent_depth`** is ignored in v2; use
  `experimental.subagent_depth` (the pack's source config now does).
- **`subtask`** on commands is a **deprecated alias** in v2; use `subagent`. v2
  docs conflict on whether the alias still delegates.
- Project `.opencode/skills/` is auto-discovered in v2.

## Enforcement

Run the fail-closed v2 conformance check:

```bash
npm run validate:opencode-schema:v2
```

`--v2-strict` validates the v2 target output (no v1-only keys, no co-written key
sets, v1-only action names rejected, plugin-defined actions accepted) and scans agents
and commands for untranslatable tokens. CI runs it as its own job
(`validate-opencode-schema-v2`).
