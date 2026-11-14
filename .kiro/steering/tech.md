# Technology Stack

## Core Framework

- **React 18** with functional components and hooks
- **TypeScript** in strict mode for type safety
- **Vite** for fast builds and HMR during development

## Styling

- **CSS Modules** for scoped component styles
- Class naming: `.keyquest-{component}-{modifier}`
- No CSS-in-JS libraries; keep styles in `.module.css` files

## State Management

- **React Context + useReducer** for global game state
- No Redux or external state libraries
- Custom hooks for specific concerns (useDefectDiscovery, useAutoSave)

## Persistence

- **localStorage** only—no backend, no database
- Key: `keyquest-progress-v1` with schema versioning
- Graceful degradation when storage unavailable

## Testing

| Tool | Purpose |
|------|---------|
| Vitest | Unit and integration tests |
| Playwright | E2E browser automation |
| @axe-core/playwright | Automated accessibility checks |

## Static Deployment

- Output is static HTML/JS/CSS via `npm run build`
- No server-side rendering required
- Deployable to any static host (GitHub Pages, Netlify, S3)

## Common Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm test             # Run unit tests (Vitest)
npm run test:e2e     # Run Playwright E2E tests
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint
```

## Do Not Add

- Backend services or APIs
- Databases (use localStorage only)
- Authentication systems
- CSS-in-JS libraries (styled-components, emotion)
- Heavy state management (Redux, MobX, Zustand)
- Animation libraries beyond CSS transitions
