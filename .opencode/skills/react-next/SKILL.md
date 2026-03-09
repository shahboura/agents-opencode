---
name: react-next
description: React and Next.js frontend best practices with TypeScript and accessibility
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: development
---

## What I do
- Enforce TypeScript strict mode and component architecture standards
- Apply accessibility, performance, and data-fetching best practices
- Guide testing strategy with behavior-focused patterns

## When to use me
Use this when building or maintaining React or Next.js frontend applications.

## Key Rules
- TypeScript strict mode required — no implicit `any`, strict null checks enabled
- Function components and hooks only — no legacy class components
- Keep components small and presentational; lift state up; prefer derived state over duplicates
- Use stable keys — never use array index as key for dynamic lists
- Apply `useMemo` and `useCallback` judiciously — only for genuinely expensive computations
- Prefer server components or loaders over `useEffect` for data fetching in Next.js
- Use React Query or SWR for client-side caching; handle loading, error, and empty states explicitly
- Provide labels, aria attributes, and keyboard navigation on all interactive elements
- Use semantic HTML elements — prefer native controls over styled divs
- Maintain color contrast; respect `prefers-reduced-motion` for animations
- Test with React Testing Library — test user behavior, not implementation details
- Mock network calls in tests; never hit real backends in unit tests
- Use Next/Image or CDN for images; apply code-splitting with dynamic imports for heavy modules
- Keep styling consistent (CSS modules, Tailwind, or chosen system) — no mixed ad hoc patterns
- Use a verify-fix-verify loop: run the validation commands below, fix any failures, and rerun until all checks pass

## Validation Commands
```bash
npm ci
npm run lint
npm test
npm run build
```
