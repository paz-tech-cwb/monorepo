# Feature: Deployment and Runtime

## Purpose

Run the platform locally and deploy containerized services reliably.

## Local development

There are exactly two backend environments: **production** (deployed via Coolify, `docker-compose.yaml`) and **local/staging** (bare-metal `npm run start:dev`, port 3001, against the shared Postgres container defined in `docker-compose.staging.yaml`: `church_staging_postgres`, host port 5433).

Every local checkout or git worktree that runs the backend must point its `backend/.env` at that same shared `church_staging_postgres` container (start once with `docker compose -f docker-compose.staging.yaml up -d postgres`, leave it running). Never start a second/alternate local Postgres container to test against — since every worktree's backend binds the same port 3001, running two local databases only means whichever backend process is currently up silently serves whichever DB it happens to be configured for, with no indication to the client that it's the wrong one. If port 3001 already answers on `npm run start:dev`, check `lsof -i :3001` for a stale process from a different checkout before assuming your current worktree's code is running.

Root scripts start the common local stack:

- PostgreSQL through Docker.
- Backend dev server.
- Admin UI dev server.
- Mobile app separately when needed.

## Containerized deployment

The root `docker-compose.yaml` is the deployment entrypoint for containerized environments such as Coolify. It keeps services on the Docker network and expects public routing to be provided by the hosting layer.

Expected public URL contract:

```bash
API_BASE_URL=https://church-api.<domain>/api
ADMIN_BASE_URL=https://church-admin.<domain>
CORS_ORIGIN=https://church-admin.<domain>
```

## CI/CD (GitHub Actions)

The monorepo runs path-filtered GitHub Actions workflows from `.github/workflows/` at the repo root — no per-app repo has its own CI anymore.

- `ci-admin-ui.yml`, `ci-backend.yml`, `ci-kmp-mobile.yml`: run on pull requests to `develop`/`main`, scoped by `paths:` to their own folder (`admin-ui/**`, `backend/**`, `kmp-mobile/**`). A PR touching only one app never triggers another app's checks.
- `deploy-admin-ui.yml`, `deploy-backend.yml`: run on push to `main`, also path-filtered, and additionally gated behind the repo variable `DEPLOYS_ENABLED` (`if: vars.DEPLOYS_ENABLED == 'true'`). Until that variable is set to `true`, these jobs no-op by design — that is expected, not a failure.
- Both deploy workflows call the shared composite action `.github/actions/coolify-deploy/action.yml`, which SSHes into the VPS (`root@62.238.45.195`) and runs `coolify-guarded-deploy <app-name>` (`paz-curitiba-admin-ui` / `paz-curitiba-api`). The action passes `app-name` and the SSH key via `env:` (never interpolated directly into shell script text) and validates `app-name` against an allowlist before use — do not regress this when touching the action.
- Deploys require the repository secret `VPS_SSH_KEY` (an SSH private key authorized on the VPS) to exist on `paz-tech-cwb/monorepo`. This is a manual, human-owned setup step — no automation should attempt to generate or store this secret itself.
- When adding a new deployable app folder, follow this same pattern: one path-filtered PR-CI workflow, one path-filtered gated deploy workflow reusing the composite action, rather than inventing a new mechanism.

## Database

- The backend production container runs pending TypeORM migrations before starting the API process.
- For local/manual workflows, use `cd backend && npm run migration:run` when applying pending migrations directly.
- Keep `DB_SYNCHRONIZE=false` outside disposable local/dev contexts.

## Observability bridge

The optional `observability-bridge/` service provides read-only, sanitized GlitchTip summaries for OpenHarness/debugging. It is reusable across projects through JSON config aliases, enforces project/environment allowlists and range limits, and keeps the GlitchTip API token server-side.

Root Docker Compose keeps the bridge behind the `observability` profile so deployments must opt in explicitly. Coolify deployments should configure `OBSERVABILITY_BRIDGE_TOKEN`, `GLITCHTIP_API_TOKEN`, `GLITCHTIP_BASE_URL`, and `OBSERVABILITY_BRIDGE_CONFIG` as secrets/runtime variables.

## Change checklist

- Update `.env.example` when runtime variables change.
- Update root/app Docker files together when service contracts change.
- Document migration/deployment steps in PR progress notes.
