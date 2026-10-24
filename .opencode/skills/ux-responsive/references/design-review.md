# Design Review — rubric for a UI diff

Companion to `SKILL.md`. Use it when reviewing a UI diff (page, component, styling
change, or a screenshot attached to a PR), not when auditing a whole product.

## Reference first

Before judging anything below, find the project's visual reference:

1. **Use `DESIGN.md` if it exists.** It records the accent and neutral ramp, type scale,
   spacing rhythm, radius, motion, and the signature element. Judge the diff against it.
   A diff that deviates from a signed-off `DESIGN.md` is a finding, even if the new look
   is pleasant. If the file is marked proposed or "needs sign-off", treat it as a draft:
   cite it, but do not fail a diff for deviating from an unconfirmed value. For a new
   project, copy `references/design.template.md` to `DESIGN.md` and fill it in.
2. **If `DESIGN.md` is absent, look for an in-repo pattern first** — an existing page,
   layout, or component library in the same product. Reuse beats invention: say which
   existing pattern the diff should follow and cite the file.
3. **Only if neither exists, ask at most three forced-choice questions.** Never hold the
   review for a style interview, and never invent a new look for the author. Forced
   choice means options with a recommendation, not open questions:

   - "Accent: (a) blue from the logo, (b) neutral-only with one accent. Recommend (b)."
   - "Type: (a) system sans, (b) the bundled Inter. Recommend (a) unless body copy grows."
   - "Density: (a) compact tables, (b) roomy cards. Recommend (b) at current page count."

If the questions cannot be answered, report the diff as `needs reference` — do not
substitute your own taste. Propose nothing that is not already in the repo.

## What to check

| Axis | Question | Failure looks like |
|---|---|---|
| Distinctiveness | Does this look like the model's default output — centered hero, three cards, indigo-to-purple gradient, rounded-2xl, generic sans? | Every screen in the product looks the same and interchangeable with any other product's |
| Hierarchy | Is there exactly one primary action and one clear focal point per view? | Two competing CTAs, everything bold, or no visual entry point |
| Type scale | Is there a small, fixed set of sizes (3–5) used consistently, with one pairing? | Arbitrary sizes (13/15/17px), mixed families, headings styled inline per page |
| Colour strategy | Is there one accent used for action and emphasis, and a neutral ramp for everything else? | Accent used for body text and decoration, semantic colours invented per component |
| Spacing rhythm | Do margins and padding come from one scale (4/8/12/16/24/32)? | One-off `margin-top: 13px`, spacing that changes between identical sections |
| Radius and motion | Are radius and duration tokens shared, and motion purposeful (feedback, not decoration)? | Mixed corner radii, bounce/parallax on a form, animation that ignores `prefers-reduced-motion` |
| States | Are loading, empty, error, and long-content states designed, not just the happy path? | Spinner with no skeleton, blank panel when the list is empty, unhandled error path |

Also verify the responsive and accessibility baseline in `SKILL.md` (reflow, focus,
target size, contrast) — this rubric does not repeat those checks.

## Pass/fail checklist

Six items. All six pass or the diff needs changes.

- [ ] A reference exists: `DESIGN.md`, or a cited in-repo pattern, or three forced-choice answers recorded.
- [ ] The diff does not introduce a new visual language; it reuses the documented tokens or an existing component.
- [ ] One primary action and one focal point per view; hierarchy survives a squint test.
- [ ] Type sizes and weights come from the documented scale; no new one-off size.
- [ ] Spacing and radius come from the documented rhythm; colour follows the accent/neutral strategy.
- [ ] Loading, empty, and error states are present and match the rest of the surface.

A failing item names `file:line` (or the screenshot region) and the existing pattern or
token it should use. "Looks off" is not a finding.
