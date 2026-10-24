# DESIGN.md — visual decisions for this project

Copy this file to the repo root of a project and fill it in. Agents read it before
styling any UI; a diff that contradicts it is a finding, and a diff that adds an
undocumented visual language is a finding too.

> **Status: proposed — needs human sign-off.** Every value below is a placeholder until
> the project owner confirms it. Do not treat unconfirmed values as a standard, and do
> not introduce a value that is not listed here without adding it here first.

## Accent and neutral ramp

| Token | Value | Use |
|---|---|---|
| `--accent` | `#000000` (proposed) | Primary action, selected state, one emphasis per view |
| `--accent-hover` | `#000000` (proposed) | Hover/pressed for the primary action only |
| `--bg` | `#ffffff` (proposed) | Page background |
| `--surface` | `#f5f5f5` (proposed) | Cards, panels, raised rows |
| `--border` | `#e5e5e5` (proposed) | Dividers and control outlines |
| `--text` | `#111111` (proposed) | Body and headings |
| `--text-muted` | `#666666` (proposed) | Secondary labels, metadata |

Dark mode: same roles, inverted ramp — record the six values beside these when confirmed.

## Type scale and pairing

- Families: `--font-sans` (proposed: system UI stack), `--font-mono` (proposed: system mono).
- Scale (proposed): 12 / 14 / 16 / 20 / 24 / 32 / 48 px. No other sizes; body is 16.
- Weights: 400 body, 500 labels, 600 headings only.
- Line height: 1.5 body, 1.2 headings. Measure: 60–75 characters.

## Spacing rhythm

Base unit 4 px. Allowed steps (proposed): 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.
Section gap 48, block gap 24, control gap 8. No one-off pixel values.

## Radius

(Proposed) `--radius-sm: 4px` controls, `--radius-md: 8px` cards, `--radius-full` for
pills and avatars only. Pick one and keep it; mixed radii read as unfinished.

## Motion

(Proposed) 120 ms for state changes, 200 ms for enter/exit, `ease-out` entering and
`ease-in` leaving. Animate opacity and transform only. Honour
`prefers-reduced-motion: reduce` by dropping to 0 ms.

## Signature element

(Proposed) One recognisable element that makes this product look like itself — a
distinctive header rule, a numbered section marker, a chart style, a card treatment.
Describe it in one sentence and name where it appears. Exactly one.

## Reference

- Link or screenshot: _TODO — paste a link, or add `docs/design/<name>.png` and reference
  it here._
- Source of truth for tokens: _TODO — e.g. `src/styles/tokens.css`._
- Last reviewed by: _TODO — name, date._
