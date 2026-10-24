# DESIGN.md — visual decisions for this project

Copy this file to your repo root as `DESIGN.md` and fill it in. Agents read it before
styling any UI: a diff that contradicts it is a finding, and a diff that introduces an
undocumented visual language is a finding too.

> **Status: proposed — needs human sign-off.** Replace every placeholder below with a
> real value and delete this banner. Until then, agents treat the file as a draft.

## Accent and neutral ramp

| Token | Value | Use |
|---|---|---|
| `--accent` | `#RRGGBB` | Primary action, selected state, one emphasis per view |
| `--accent-hover` | `#RRGGBB` | Hover/pressed for the primary action only |
| `--bg` | `#RRGGBB` | Page background |
| `--surface` | `#RRGGBB` | Cards, panels, raised rows |
| `--border` | `#RRGGBB` | Dividers and control outlines |
| `--text` | `#RRGGBB` | Body and headings |
| `--text-muted` | `#RRGGBB` | Secondary labels, metadata |

Dark mode: same roles, inverted ramp. Record the six values beside these when confirmed.

## Type scale and pairing

- Families: `--font-sans`, `--font-mono`.
- Scale: e.g. 12 / 14 / 16 / 20 / 24 / 32 / 48 px. List what you use; no other sizes.
- Weights: e.g. 400 body, 500 labels, 600 headings only.
- Line height: e.g. 1.5 body, 1.2 headings. Measure: 60–75 characters.

## Spacing and radius

- Spacing scale: e.g. 4 / 8 / 12 / 16 / 24 / 32 / 48 px.
- Radius: one value for controls, one for cards; no one-off radii.
- Density: comfortable or compact — pick one and say where it applies.

## Motion

- Durations: e.g. 120 ms for state changes, 240 ms for entrances.
- Easing: one standard curve; note any exception.
- Respect `prefers-reduced-motion`.

## Signature element

One distinctive detail this product is recognisable by (a rule, a corner treatment, a
type quirk, a colour pairing). Describe it, then use it consistently. This is what stops
the UI from looking like the model's default.

## Reference

- Screenshot or URL of the look this project follows, or `none — decided from scratch`.
- Decisions that were rejected, and why, if the choice was contested.

## Rules

- A new visual value is added here before it is used in code.
- A diff that adds a token not listed here is a finding, not a style preference.
