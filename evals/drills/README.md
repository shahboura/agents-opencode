# Drill Suite — pre-registered behavioural checks

These drills answer one question the static harness cannot: **does the pack change what
an agent does?** They are run by a human (or the orchestrator), not by CI.

## The two conditions

| Condition | Setup |
|---|---|
| **A — pack** | the repo as-is (or an installed copy), agents and skills available |
| **B — bare** | the same model and prompt with no pack agents/skills loaded |

Both conditions use the same prompt, the same pinned model, and a fresh workspace. The
only variable is the pack.

**Condition B (bare)** is the same worktree with `.opencode/` removed and the harness
agent used instead: `opencode run --standalone --auto --agent build --model <pinned>`.
Do not leave pack skills discoverable — that is the variable under test.

## Protocol

1. Pin the model (`--model provider/model#variant`) and record it.
2. Run screening: **8 drills × 2 conditions × 1 trial** = 16 runs.
3. Any drill where A and B differ gets **2 more trials** (3 total) to check stability.
4. Record per run: verdict (pass/fail), tokens, wall time, and the transcript path.
5. Do not grade the path. Grade the observable outcome in the drill's criteria.

## Caps (F3)

The binding and advisory caps, and the `INCOMPLETE` path, live in
[`../decision.md`](../decision.md#caps). Do not restate them here.

## Go / no-go

Write the result to `evals/decision.md`.

- **Go** (build the automated A/B runner) if the pack wins at least two drills and loses
  none.
- **No-go** (park the runner) if the conditions tie on every drill, or the pack loses
  more than it wins. A tie means the harness is overhead on the tested model tier.
- **Inconclusive** if the caps were hit or transcripts are missing.

## Files

| File | Purpose |
|---|---|
| `tasks.md` | the eight pre-registered drills |
| `../headless.md` | how to run a drill without permission prompts |
| `../decision.md` | the go/no-go record and its caps |
| `../transcripts/` | one markdown file per run, named `<drill>-<condition>-<n>.md` |
