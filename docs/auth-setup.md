# RunReady SG Auth Setup

This branch is wired for Clerk-backed authentication:

- frontend: Vite React uses Clerk's React SDK
- backend: FastAPI verifies Clerk session tokens from the `Authorization` header
- public feature: `check-run`
- protected features when auth is enabled: shelter, route planning, best times

Clerk is handling the real identity store, password hashing, sign-up, sign-in,
email verification, and session lifecycle. RunReady only needs to:

- open the sign-in / sign-up flow in the frontend
- send Clerk's session token to the backend
- verify that token and trust the `sub` user id

Official references:

- React quickstart: https://clerk.com/docs/react/getting-started/quickstart
- Making authenticated requests: https://clerk.com/docs/guides/development/making-requests
- Manual JWT verification: https://clerk.com/docs/guides/sessions/manual-jwt-verification

## Frontend env

Copy [frontend/.env.example](/home/mustafaah/run-ready-sg/frontend/.env.example) to
`frontend/.env.local` and set:

```env
VITE_API_BASE=http://localhost:8001/api
VITE_AUTH_ENABLED=true
VITE_CLERK_PUBLISHABLE_KEY=<your-clerk-publishable-key>
```

## Backend env

Copy [backend/.env.example](/home/mustafaah/run-ready-sg/backend/.env.example) to
`backend/.env` and set:

```env
AUTH_ENABLED=true
AUTH_PROVIDER_NAME=Clerk
AUTH_ISSUER=https://<your-instance>.clerk.accounts.dev
AUTH_JWKS_URL=https://<your-instance>.clerk.accounts.dev/.well-known/jwks.json
AUTH_AUTHORIZED_PARTIES=http://localhost:5173,https://runready.xyz,https://www.runready.xyz
```

Notes:

- `AUTH_ISSUER` should match the `iss` claim in Clerk session tokens.
- `AUTH_JWKS_URL` is the public key endpoint used by the backend verifier.
- `AUTH_AUTHORIZED_PARTIES` should list the frontend origins allowed to mint
  session tokens for this backend. Clerk exposes this as the `azp` claim.

## Local run

1. Start the SSH tunnel to the database.
2. Start the backend:

```bash
cd backend
../.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

3. Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

## What to test

1. Open `http://localhost:5173`.
2. Confirm `check-run` still works as a guest.
3. Open `Shelter`, `Route`, or `Time`.
4. Confirm the login modal appears.
5. Choose sign in or sign up.
6. Complete the Clerk flow.
7. Confirm you return to the app and the protected API calls succeed.

## Backend auth smoke test

With a valid Clerk session token:

```bash
curl http://localhost:8001/api/auth/me \
  -H "Authorization: Bearer <clerk-session-token>"
```

Expected result:

- `authenticated: true`
- `provider: "Clerk"`
- `user.sub` contains the Clerk user id
