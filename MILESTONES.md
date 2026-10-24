# Milestones

Session history for this repository, newest first. `AGENTS.md` points here; agents
append new entries at task completion.

## Format

```markdown
### YYYY-MM-DD HH:MM - [Brief Task Description]
**Agent:** [agent-name]
**Summary:** [What was done]
- Key decisions, files changed, patterns used
- Lessons learned for future sessions
```

Rules:

- Date/time to minute precision; newest first (prepend).
- 3-5 bullets per entry; skip trivial edits.
- Keep the file under 100 KB by pruning the oldest entries.

### 2026-10-22 05:46 - Permission-fatigue diagnosis validation + agent/skill hardening

**Agent:** orchestrator
**Summary:** Independently validated the headless "prompt approval fatigue" diagnosis against two real sessions, corrected the premise, and shipped the evidence-backed fixes.
- Validation correction: the static 99% allowlist statistic is not the ask rate. Actual asks were 77 (75 Allow always, 2 reject), and 168 saved project rules already covered edit/shell. `agents.<id>.permissions` cannot override pack markdown; saved approvals can override an `ask`, while the saved-rule/`deny` interaction remains untested (PERM-2).
- Security: all 10 agents now deny `.env`/`.env.*`/`.envrc` reads after their read grant, with template allows; the runtime guard covers `read` and `grep` paths; env-prefixed test-runner allows were evaluated and intentionally left as `ask` (leading `*` allows were too broad); the review gate freezes `.gate/diff.patch` via `gate:freeze` (manual: `git add -N . && git diff HEAD > .gate/review.patch`), lenses read the brief path, PARTIAL/`INSUFFICIENT_DIFF` lenses are re-dispatched, and review/codebase/orchestrator step budgets were raised.
- Pruning/portability: trimmed duplicated blogger/brutal-critic/legal-advisor prose, lightweight `adr`, removed human-team rollout from `refactoring`, fixed `go`/`sqlfluff` non-blocking validators, host-specific `ui-ux-pro-max` path, and maintainer notes.
- Tests: new `scripts/agent-permissions.test.js` + fail-closed `read`/`.env` validator check; fixed the npm 11 `pack --json` shape in `test-npx-integrity.js`; `npm run doctor` 25/25.
- Lesson: validate permission claims against saved rules and the resolved host rule array; a static allowlist ratio is not a prompt count. Config agent rules are inert against pack markdown; the working lever is Allow always plus a `deny` floor.

### 2026-10-18 12:53 - Installer cleanup advice hardening (symlink-safe removal)

**Agent:** orchestrator
**Summary:** Follow-up to the global split-warning fix; gated PASS after a 2-cycle lens panel on `fix/installer-cleanup-advice`.
- Symlink cleanup now warns "no trailing slash": `rm -rf <link>/` follows the link and deletes the target; docs name `unlink` and `cmd /c rmdir` (no `/s`).
- Real-directory cleanup no longer says "remove the old files": move aside or uninstall with `--uninstall --global` after clearing `XDG_CONFIG_HOME` (targets legacy, backs up, prunes).
- Review caught the manifest-only route (does not clear detection / bypasses backups) and the PowerShell `rmdir` alias hazard; both fixed in cycle 2.
- Lesson: for cleanup advice, require a command-level data-loss repro; "not its target" is not enough when a trailing slash changes behavior.
- Also ignored local `graphify-out/` in git and markdownlint, and added the graphify usage note to AGENTS.md.

### 2026-10-18 07:15 - v2 host-coexistence: skill allow-all, narrowed shell allowlist, overlay + validator fixes

**Agent:** orchestrator
**Summary:** Shipped OpenCode v2 host coexistence on `feat/v2-host-coexistence` (commit 15c47d8), gated PASS-WITH-CAVEATS after a 2-cycle multi-lens review (4 lenses + 3-lens delta) and container e2e.
- Skill policy: pack agents allow all skills so host/plugin skills (`ui-ux-pro-max`, `graphify-usage`, ponytail) stay usable; docs teach the mechanisms that actually bind (agent-file edits, v2 `integration.use` policies) because global permission rules lose to agent rules (appended last).
- Shell: content-free diagnostics + test runners auto-approve; content readers (`git diff/log/show`, `docker logs`, `kimaki session read`), redirection, and `git --output` ask; `rm -rf`/force-push denies moved LAST so last-match-wins keeps them (the security delta caught the first guard placement demoting denies to ask).
- Config/validators: `external_directory` ask, `experimental.subagent_depth`, `compaction.keep.tokens`; v1-only actions rejected, plugin/tolerated actions accepted, nested `agents.<id>.permissions` checked, adapter-order + agent-allowlist-order tests added.
- Evidence: doctor 24/24; clean OpenCode 2.0.32 resolved-rule checks (isolated service); container e2e v2.0.32 43/43 and v1.19.2 regression; found the 2-3-call `debug agents` warm-up quirk.
- Lesson: v1→v2 permission-map order is load-bearing - wildcard first, allows, guards, denies last. Never append ask guards after denies (last match wins).

### 2026-10-16 05:30 - v2 hardening: plugin aligned to the published v2.0.30 API, verified on real v1 + v2 sandboxes

**Agent:** orchestrator
**Summary:** Hardened the OpenCode v2 path on `feat/skills-and-v2-hardening` (which also carries the Superpowers skills port) and verified it against real hosts.
- Live-docs + shipped-type verification found the v2 plugin registered the right hooks but wired the wrong event shapes: context injection read a non-existent `event.context` (now `event.system` text parts), logging used a non-existent `ctx.client` (now a console fallback), and `ctx.event` was used as a callback (now `subscribe({signal})` + AbortController); hook registrations are awaited/contained (`Promise<Registration>`).
- A disposable Docker sandbox against **opencode 2.0.30** found two more: the v2 skill descriptor omitted the required `name` (plugin-spec skill delivery threw `SchemaError`), and v2-emitted config carried keys v2 marks unsupported.
- The review cycle then caught a data-loss bug — the new config strip deleted *user* values for keys the installer never manages — removed; the v2 guard now emits rate-limited telemetry when a read event has no resolvable path (fail-open made visible).
- Final verification: disposable Docker sandboxes on **opencode 1.19.2 (regression PASS)** and **2.0.30 (fixes PASS)** — plugin loads, all 10 agents and 27 skills discovered on both, zero plugin errors; docs overclaims corrected and a README roadmap note added.
- Caveat: the sandbox has no model/API key, so live guard-block, context injection, and `--target auto` detection remain unexercised — the tracked exit gate before declaring v2 fully supported.

### 2026-10-15 01:00 - `--target auto` host detection + UI/UX backlog entry

**Agent:** orchestrator
**Summary:** Landed OpenCode host-version detection for `--target auto` on `feat/auto-target-detection`, plus the deferred UI/UX (ui-ux-pro-max) backlog entry.
- `auto` runs `opencode --version` (spawnSync, pinned `cwd` to avoid repo-local shim resolution, 4s timeout, stderr fallback) and selects v2 when the major is >= 2, else v1; explicit `--target` and a manifest-recorded target still win; detection runs once per process, after structural guards, and fails open to v1. `AGENTS_OPENCODE_HOST_VERSION` overrides detection (tests/CI).
- Gated PASS-WITH-CAVEATS (Tier 1 + Tier 2 requirements/code/security over 2 cycles). The security lens flagged the Windows CWD-before-PATH shim risk — the sole blocking item — fixed by pinning the spawn `cwd`.
- Also fixed the CI-only installer failure that turned main red: `testGlobalAndProjectLifecycle` wasn't hermetic under an ambient `XDG_CONFIG_HOME` (GitHub runners set it); landed on `fix/installer-test-xdg-hermetic` (merged).
- Lesson (recurring): `git checkout -b <branch> origin/main` sets the branch upstream to `origin/main`, so a bare `git push` pushes straight to main. Use `git switch -c` / `--no-track` and protect `main`.
- BACKLOG: Phase 1 marked partly shipped; new "UI/UX skill integration (deferred)" section (UIUX-1).

### 2026-10-15 00:30 - OpenCode v1/v2 dual support (target adapter, dual plugin, plugin-spec install, XDG fix)

**Agent:** orchestrator
**Summary:** Shipped OpenCode v1/v2 dual support on `feat/opencode-v2-dual-support`; gated PASS-WITH-CAVEATS after a full multi-lens review (2 cycles) plus an independent adversarial pass.
- Installer target adapter (`scripts/lib/opencode-target.js`, `--target v1|v2|auto`): v1 `plugin`/`permission` vs v2 `plugins`/`permissions`, never co-written; manifest records the target; uninstall reverts per-target keys.
- One dual-entrypoint plugin (v1 named export + v2 default `{ id, server, setup }`); v2 hook mapping with feature-detect + per-registration containment; secret-read guard parity (throws on both hosts). Verified `opencode 1.19.0` loads the plugin (`opencode debug info`).
- Hybrid install model: file installer delivers agents/commands/skills/config; a plugin-spec install (`plugins: ["agents-opencode"]`, via new package `exports`) delivers skills + hooks/guards only; coexistence guard prevents double registration.
- Fix: installer now honors `XDG_CONFIG_HOME` (verified via `opencode debug paths`) with a legacy-path split-brain warning; new real `--v2-strict` validator + CI job.
- Caveats: v2 runtime unverified (no live v2/Bun); v2 agent/command compat relies on v2 auto-translation (documented as the load-bearing assumption); `--target auto` still resolves v1 (detection not wired).

### Earlier milestones (2025-12 to 2026-09-30)

- **2026-09-30**: docs site moved to Astro Starlight on Cloudflare Workers; GitHub Pages artifacts removed, `site/` kept out of the npm tarball. **2026-09-28/29**: multi-lens pre-commit gate (doctor + requirements/code/security/ux), fail-closed validators, `@researcher` decision grounding, README/instruction pruning.
- **2026-09-18**: permission fixes (bash denies, question tool), plugin runtime inventory + secret guards, config uplift (`subagent_depth`, compaction, watcher), installer writes only managed config keys. **2026-08-22**: two-tier review gate, Socket.dev license fix, dev-dep bumps.
- **2026-07-02**: v2.2.0 uplift (usage showcase, docs pruning, 7 coordination patterns, legal-advisor generalization, code-change-impact, human-in-loop). **2026-05-05**: v2.0.0 uplift (runtime plugin, legal-advisor, progressive disclosure, state-contract memory).
- **2026-04-25**: state contract + handoff packets, eval trend artifacts, deprecation policy, risk/changelog CI gates, canonical `.opencode/agents/`, bounded loops, `doctor` entrypoint.
- **2025-12 to 2026-03**: foundation (8 agents, 14 instruction files, lazy AGENTS.md), context optimization (~70% smaller sessions), commands migration, package-based installer, core-only skill policy, docs clarity.

### Deferred — pattern references (evaluated, not implemented)

**Agent:** orchestrator
**Summary:** Researched Anthropic agent patterns; three genuine gaps worth a follow-up. References retained for reuse.
- Voting/redundancy to harden Tier 2: https://www.anthropic.com/engineering/building-effective-agents ("Parallelization → Voting")
- Effort-scaling rules for delegation: https://www.anthropic.com/engineering/multi-agent-research-system (principle #3)
- Filesystem artifact handoff (bypass coordinator "game of telephone"): https://www.anthropic.com/engineering/multi-agent-research-system (Appendix)
