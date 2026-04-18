# Frontend SaaS Readiness Audit

This note summarizes the current frontend state for SaaS readiness. It focuses on what is complete, what is missing, and what should be fixed before treating the frontend as production-ready.

## High Priority Gaps

### 1. Authentication is stubbed, not wired
- `frontend/src/App.tsx` hardcodes `isGuest = true`, and the login modal is commented out.
- The app currently behaves like a guest-only experience with no real sign-in, sign-out, session refresh, or protected route logic.
- Impact: there is no account-based SaaS flow yet, so feature gating and monetization are incomplete.

### 2. No global error boundary or user-facing API error strategy
- `frontend/src/App.tsx` and page components rely on `console.error` when requests fail.
- `frontend/src/services/api.js` defines a basic Axios client, but there are no interceptors, retries, or centralized error mapping.
- Impact: runtime errors or backend failures can leave the user with silent failures or blank/partial UI.

### 3. Testing is effectively absent in the frontend
- `frontend/package.json` only includes `dev`, `build`, and `preview` scripts.
- There are no frontend test files or configured testing tools in the repository.
- Impact: regressions in navigation, API handling, or location flows are not being caught automatically.

### 4. Accessibility is incomplete
- `frontend/src/components/BottomNav.tsx` uses buttons but does not expose active state semantics such as `aria-selected`.
- `frontend/src/components/QuotaModal.tsx` is visually polished but lacks dialog semantics like `role="dialog"`, focus trapping, and keyboard-first handling.
- `frontend/index.html` is minimal and does not include broader accessibility or app metadata beyond the basics.
- Impact: keyboard and screen-reader users will have a weaker experience than expected for a production SaaS.

### 5. API feedback and loading states are thin
- Several screens only log errors and do not provide strong retry/help messaging.
- Loading states exist in places, but there are no skeletons or consistent empty-state patterns across all async views.
- Impact: the UI can feel uncertain or broken when network calls are slow or fail.

## Medium Priority Gaps

### 6. Route feature looks partially complete
- `frontend/src/pages/RouteView.tsx` supports multiple routes in the UI, but the mock data still returns only one route in `frontend/src/services/mock.js`.
- The map logic is prepared for multi-route behavior, but the end-to-end experience still feels unfinished in mock mode.

### 7. Geolocation fallback is functional but not great UX
- `frontend/src/components/LocationProvider.tsx` treats denied or unavailable location as a completed state, but the UI relies on passive messages rather than a guided recovery path.
- Impact: users who deny location permission may not understand how to recover or why results are degraded.

### 8. No observability hooks in the frontend
- There is no client-side error tracking, analytics, or session monitoring integration.
- Impact: production debugging and usage analytics will be limited.

### 9. Environment setup is not developer-safe
- `frontend/.env` is committed and contains `VITE_API_BASE=https://api.runready.xyz/api/`.
- There is no `frontend/.env.example` for onboarding or safe environment documentation.
- Impact: the repo leaks deployment-specific configuration and does not clearly document required env vars.

### 10. Tooling is light for a SaaS codebase
- `frontend/package.json` lacks lint, typecheck, test, and CI-friendly scripts.
- `frontend/vite.config.js` is fine for local development, but there is no documented production validation workflow in the frontend package.

## What Looks Complete

- Core screens exist: Home, Landing, Shelter, Route, and Time.
- Shared UI components are present and reasonably consistent.
- Map integration is in place with Leaflet and route/shelter overlays.
- Guest quota logic exists and the quota modal is implemented.
- Mock-backed API development is structured and aligned with the backend contract docs.
- The frontend is built with React, TypeScript, Vite, and a modern component stack.

## Missing For A SaaS MVP

- Real authentication and session management
- Protected route or account-gated flows
- Global error boundary
- Centralized API error handling and retries
- Frontend test suite
- Strong loading and empty states across all async screens
- Accessible modal and navigation semantics
- Client observability and crash reporting
- Safe environment example file
- Logout and account switching flow
- Clear legal/compliance entry points such as privacy and terms links

## Recommended Next Actions

1. Wire authentication and session handling properly.
2. Add a top-level error boundary plus Axios interceptors for user-facing failures.
3. Introduce frontend tests for the critical flows.
4. Improve accessibility for nav, modals, and async states.
5. Add `.env.example`, a lint/test script set, and basic observability.

## Bottom Line

The frontend is solid as a feature prototype and demo shell, but it is not yet complete as a SaaS frontend. The main missing pieces are authentication, resilience, testing, accessibility, and production observability.