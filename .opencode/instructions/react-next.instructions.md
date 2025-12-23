---
description: React / Next.js frontend best practices with TypeScript and accessibility
applyTo: '**/*.{tsx,jsx}'
---

# React & Next.js Instructions

## Tooling
- Use TypeScript with strict mode; keep `tsconfig` clean (noImplicitAny, strictNullChecks).
- Enforce linting (ESLint) and formatting (Prettier); include lint/test scripts in package.json.
- Prefer `npm ci` in CI; commit lockfiles.

## Components & State
- Favor function components and hooks; avoid legacy class components.
- Keep components small/presentational; lift state up; prefer derived state over duplicates.
- Use stable keys; avoid array index keys for dynamic lists.
- Memoize expensive computations (`useMemo`, `useCallback`) judiciously.

## Data Fetching
- For Next.js, prefer `fetch`/`cache` APIs or data-fetching methods appropriate to the route type.
- Use React Query/SWR for client caching; handle loading/error/empty states explicitly.
- Avoid fetching in `useEffect` when server components or loaders are more appropriate.

## Accessibility & UX
- Provide labels/aria attributes; manage focus; ensure keyboard navigation.
- Maintain color contrast; avoid motion without reduce-motion guardrails.
- Use semantic HTML over divs; prefer native controls where possible.

## Error Handling
- Handle errors at boundaries; use error boundaries for React trees as needed.
- Don’t swallow async errors; surface user-friendly messages.

## Styling
- Keep styling consistent (CSS modules, Tailwind, or chosen system); avoid mixed ad hoc patterns.
- Prefer design tokens/theme variables for colors/spacing/typography.

## Testing
- Use React Testing Library + Jest/Vitest; test behavior, not implementation details.
- Mock network calls; avoid real backends in unit tests.
- Add smoke tests for critical flows and accessibility checks when feasible.

## Performance
- Avoid unnecessary re-renders; split bundles where it matters (Next.js code-splitting/dynamic import).
- Optimize images via Next/Image or CDN; set caching headers.

## Validation Commands
```bash
npm ci
npm run lint
npm test
npm run build
```
