---
name: ux-responsive
description: Responsive UX guidance for small and large form factors with accessibility-first checks
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: design-and-development
---

## What I do
- Apply responsive UX best practices across phone, tablet, and desktop form factors
- Enforce accessibility-first constraints (reflow, keyboard access, contrast, target size)
- Guide breakpoint strategy, interaction-mode adaptation, and validation steps

## When to use me
Use this when implementing or reviewing UI that must work across small and large screens, touch and pointer inputs, or multiple orientations.

## Key Rules
- Mobile-first layout strategy: start with constrained viewport, then scale up
- Include viewport meta tag for web UIs: `width=device-width, initial-scale=1`
- Avoid horizontal scrolling for primary content; support reflow at narrow widths
- Validate reflow at 320 CSS px width (or equivalent 400% zoom scenario)
- Use fluid layouts (`flex`, `grid`, `%`, `fr`, `clamp`) over fixed-width pixel-only layouts
- Set media to scale safely (`max-width: 100%`) to prevent overflow
- Define content-driven breakpoints (not device-name breakpoints)
- Keep readable line lengths (~70–80 chars on wider layouts)
- Do not hide critical content at smaller widths; adapt layout and hierarchy instead
- Support keyboard navigation and visible focus states on interactive controls
- Respect touch target size and spacing for coarse pointers (target 24x24 CSS px minimum where applicable)
- Ensure sufficient color contrast and avoid color-only meaning
- Test across interaction modes (`hover`/`pointer`) before adding hover-dependent UX
- Follow WCAG 2.2 AA baseline expectations for responsive interfaces where applicable
- Use a verify-fix-verify loop: run checks, fix issues, rerun until green

## Validation Commands
```bash
# Run the active stack's lint/test/build checks.
# Examples:
# npm run lint && npm test && npm run build
# flutter analyze && flutter test
# dotnet build && dotnet test
```

## References
- https://www.w3.org/WAI/WCAG21/Understanding/reflow.html
- https://web.dev/responsive-web-design-basics/
- https://www.w3.org/WAI/WCAG22/quickref/
