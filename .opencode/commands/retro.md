---
description: Turn the last task's evidence into one durable check, standard, or drill
agent: orchestrator
subtask: true
---

# Retro

Input (optional): `$ARGUMENTS`

Close the loop on the last task. Produce exactly one durable artifact, then stop.

## Read

- The task diff: `git diff HEAD --stat` and `.gate/diff.patch` when present.
- Gate receipts: `.gate/manifest.json`, `.gate/pass.json`, `.gate/lens-*.md`.
- Failing checks and rework in this session.

## Decide

Name the environment cause: the missing guard, ambiguous rule, or absent drill that
allowed the failure. Not the one-off mistake.

Choose exactly one output:

- **Check** — a deterministic script or assertion (state file and command).
- **Standard** — one line added to an existing standard or instruction file (state file and line).
- **Drill** — a pre-registered prompt with expected artifact and pass criteria (state file).
- **No change** — the failure was not preventable by an artifact.

## Write

Prepend the entry to `LEARNINGS.md` (newest first) with three bullets: what failed,
environment cause, artifact added (or `no change`). Output the same three lines in the
reply. No prose advice, explanation, or summary.
