# Drill decision record

Complete this after screening. It is the F3 go/no-go for building the automated A/B
runner.

## Run metadata

- Date:
- Model (pinned):
- Pack commit:
- Conditions: A = pack, B = bare
- Trials per drill: screening 1; escalation 3 for drills that differed

## Caps

- **Binding:** 90 minutes wall clock for screening.
- **Advisory:** 1.5M input tokens. If the host does not expose usage, record `n/a`; the
  time cap still applies.
- If the binding cap is hit before screening finishes: record `INCOMPLETE`.

(These caps live here; `drills/README.md` links to this section.)

## Results

| Drill | A (pack) | B (bare) | Differ? | Trials | Notes |
|---|---|---|---|---|---|
| D01 installer cleanup | | | | | |
| D02 secret read | | | | | |
| D03 plan gate | | | | | |
| D04 over-built diff | | | | | |
| D05 skill description | | | | | |
| D06 ambiguous request | | | | | |
| D07 broken docs link | | | | | |
| D08 blog length | | | | | |

Summary: A wins `__`, B wins `__`, ties `__`.

## Verdict

- [ ] **Go** — build the A/B runner (`EVAL-1`): A wins at least two drills that B could
      also attempt, and A loses none.
- [ ] **No-go** — park the runner: A wins at most one, or loses at least one (including
      ties on every drill).
- [ ] **Inconclusive** — caps hit, transcripts missing, or a drill could not be run in B.

Reason (one paragraph):

## What this does not prove

A drill suite measures outcomes on tasks we invented. It cannot show the pack made an
agent wiser, only that it passed the drills we thought to write.
