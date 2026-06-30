# Coolify VPS Migration Design

## Goal

Move the current Paz Church Curitiba production web stack to the existing Coolify VPS using one root-level Docker Compose application that runs `postgres`, `backend`, and `admin-ui`, while keeping the deployment easy to retarget later from temporary Coolify subdomains to a future `paz.church/curitiba` public structure.

## Current Repo Constraints

- The root deployment entrypoint already exists in [docker-compose.yaml](/Users/jonathalima/Developer/church/docker-compose.yaml:1).
- The root compose file is still localhost-oriented:
  - backend sets `CORS_ORIGIN=http://localhost:3000`
  - admin build args set `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api`
- The root env example in [.env.example](/Users/jonathalima/Developer/church/.env.example:1) does not yet document public deployment URLs.
- The backend env contract in [backend/.env.example](/Users/jonathalima/Developer/church/backend/.env.example:1) already includes production-relevant secrets and integrations such as JWT, Firebase Admin, Resend, Twilio, and WhatsApp.
- The admin UI is still documented as a Vercel-style deployment in [admin-ui/README.md](/Users/jonathalima/Developer/church/admin-ui/README.md:1), so the repository docs need to treat Coolify as the current deployment path.

## Chosen Approach

### Approach 1: Single Coolify App From Root Compose

This migration uses one Coolify Docker Compose application from the repository root.

Why this approach:

- It matches the current repository structure and existing root compose file.
- It keeps the initial migration operationally simple.
- It allows the later domain cutover to happen mostly through environment and Coolify routing changes instead of splitting infrastructure immediately.

Rejected alternatives:

- Separate Coolify apps for database, backend, and admin would add more flexibility later but unnecessary setup overhead now.
- Migrating only the backend or only part of the stack would not satisfy the current scope.

## Target Architecture

- `postgres`
  - Internal-only service in the Coolify app
  - Uses a persistent volume
- `backend`
  - Public temporary Coolify subdomain
  - Connects to internal Postgres service
  - Exposes the production API consumed by admin and mobile
- `admin-ui`
  - Public temporary Coolify subdomain
  - Built with the backend public API URL injected at build time
- `mobile-app`
  - Not deployed through Coolify in this step
  - Continues consuming the backend API over the temporary public backend URL

## URL Strategy

### Phase 1: Temporary Coolify Subdomains

- Backend uses a temporary Coolify subdomain
- Admin uses a separate temporary Coolify subdomain
- All public URLs are env-driven

Example shape:

- `https://church-api.<coolify-domain>`
- `https://church-admin.<coolify-domain>`

### Phase 2: Future Domain Move

The stack should later move to a `paz.church/curitiba`-style public structure.

Important constraint:

- Backend can usually move by changing public routing and environment.
- Admin may require Next.js base-path support if it must live under `paz.church/curitiba` instead of a subdomain.

Because of that, the current migration must avoid hardcoding assumptions about the final domain layout.

## Configuration Design

### Root Compose

The root compose file should become environment-driven for public URLs instead of localhost-driven.

Required changes:

- Replace hardcoded backend `CORS_ORIGIN` with an env-backed value.
- Replace hardcoded admin `NEXT_PUBLIC_API_BASE_URL` build arg with an env-backed value.
- Preserve internal service-to-service DB wiring through the `postgres` hostname.

### Root Env Contract

The root env example should document the public deployment variables needed by Coolify:

- `ADMIN_BASE_URL`
- `API_BASE_URL`
- `CORS_ORIGIN`

The root env contract should continue documenting:

- DB credentials
- JWT secrets
- Firebase public config for the admin build

### Secret Handling

- Runtime secrets stay in Coolify environment configuration.
- Repository env example files remain documentation only.
- No production secret values are committed.

## Coolify Setup Design

### App Structure

- One Docker Compose application in Coolify
- Source: repository root
- Compose entrypoint: root `docker-compose.yaml`

### Public Routing

- Assign one public domain to the backend service
- Assign one public domain to the admin service
- Do not expose Postgres publicly

### Database Lifecycle

- Persist Postgres data with the compose volume
- Run migrations explicitly after the first healthy backend deploy
- Avoid relying on implicit auto-migration behavior during the first production boot

## External Integration Impacts

### Firebase

- Add the temporary admin Coolify host to Firebase authorized domains
- Ensure frontend Firebase config matches the environment used by the deployed admin app

### Google Login

- Verify the temporary deployed domain is accepted by the current login configuration

### Apple Login

- If Apple login is active, verify whether the current setup depends on fixed production domain identity
- Treat Apple login validation as a separate risk checkpoint if it is already enabled

### Messaging and Email Providers

- Preserve existing backend provider env variables in Coolify:
  - Resend
  - Twilio
  - Meta WhatsApp

## Risks

### Path Prefix Risk For Admin

If the future production target is literally `paz.church/curitiba` for the admin interface, the Next.js app may need base-path support. The current migration should not promise that path-prefix cutover is config-only.

### Build-Time API URL Coupling

The admin build embeds `NEXT_PUBLIC_API_BASE_URL`, so the backend public URL must be decided before the admin build runs in Coolify.

### Auth Domain Drift

Firebase and OAuth configuration can fail even when the containers are healthy if the deployed public domains are not registered in provider consoles.

## Verification Strategy

After deployment:

1. Open the admin temporary domain and confirm the app loads.
2. Confirm admin requests target the deployed backend URL.
3. Confirm backend can reach Postgres and start cleanly.
4. Run backend migrations successfully.
5. Test at least one auth flow on the temporary domain.
6. Test one authenticated admin API request end-to-end.
7. Confirm mobile can call the deployed backend URL if the environment is updated to point there.

## Success Criteria

- Coolify runs the full stack from the repository root compose file.
- `postgres`, `backend`, and `admin-ui` are healthy.
- Backend and admin are reachable on temporary Coolify subdomains.
- Admin successfully calls the backend over the public API URL.
- The deployment can later move to new public domains without redesigning the stack.
