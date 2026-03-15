---
description: Responsive UX standards for small and large form factors with accessibility-first defaults
---

# UX Responsive Guidance

## Core Principles
- Design mobile-first, then scale up progressively
- Use content-driven breakpoints, not device-name breakpoints
- Keep primary reading and interaction paths single-direction scrolling
- Preserve feature parity across form factors (do not hide critical functionality)

## Layout & Sizing
- Prefer fluid layout primitives (`flex`, `grid`, `%`, `fr`, `minmax`, `clamp`)
- Avoid fixed-width containers for core content
- Apply `max-width: 100%` for media to prevent overflow
- Keep readable line lengths on large screens (~70–80 characters)
- Constrain very wide layouts with max-width for readability

## Interaction Modes
- Support both coarse and fine pointers (touch + mouse/trackpad)
- Do not rely exclusively on hover for core interactions
- Ensure controls are reachable and usable via keyboard
- Keep focus visible and unobscured

## Accessibility Baseline
- Target WCAG 2.2 AA-aligned behavior for responsive UI
- Ensure reflow support at 320 CSS px width (or equivalent 400% zoom scenario)
- Maintain sufficient color contrast and avoid color-only affordances
- Provide labels and semantic structure for form controls

## Validation Checklist
- [ ] No unintended horizontal overflow on core screens
- [ ] Primary content reflows at 320 CSS px width without bidirectional scrolling
- [ ] Navigation and primary actions are usable on narrow and wide layouts
- [ ] Keyboard traversal works end-to-end with visible focus
- [ ] Touch targets are at least 24x24 CSS px where applicable
- [ ] Contrast and error states are accessible

## References
- W3C Reflow (WCAG 2.1 SC 1.4.10): https://www.w3.org/WAI/WCAG21/Understanding/reflow.html
- web.dev responsive basics: https://web.dev/responsive-web-design-basics/
- WCAG 2.2 Quick Reference: https://www.w3.org/WAI/WCAG22/quickref/
