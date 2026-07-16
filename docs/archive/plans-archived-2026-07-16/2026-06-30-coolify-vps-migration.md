# Coolify VPS Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the root church stack to the current Coolify VPS using one Docker Compose app that runs `postgres`, `backend`, and `admin-ui` on temporary Coolify subdomains.

**Architecture:** Keep the existing root compose deployment model, but replace localhost assumptions with environment-driven public URL configuration so Coolify can build and serve the admin app against the deployed backend. Preserve Postgres as an internal service with persistent storage and run backend migrations as a controlled post-deploy step.

**Tech Stack:** Docker Compose, Coolify, PostgreSQL 16, NestJS 11, Next.js 15, Firebase Auth

---

### Task 1: Audit Current Deployment Contracts

**Files:**
- Review: `docker-compose.yaml`
- Review: `.env.example`
- Review: `backend/.env.example`
- Review: `admin-ui/.env.local.example`
- Review: `README.md`

**Step 1: Confirm root compose hardcoded localhost assumptions**

Run: `rg -n "localhost|NEXT_PUBLIC_API_BASE_URL|CORS_ORIGIN" docker-compose.yaml .env.example`
Expected: root deployment still references localhost-oriented values.

**Step 2: Confirm backend production env requirements**

Run: `sed -n '1,240p' backend/.env.example`
Expected: backend env contract includes DB, JWT, CORS, and third-party provider configuration required in Coolify.

**Step 3: Confirm admin build-time env requirements**

Run: `sed -n '1,160p' admin-ui/.env.local.example`
Expected: admin env contract includes `NEXT_PUBLIC_API_BASE_URL` and Firebase public keys.

**Step 4: Record current docs gap**

Run: `sed -n '1,220p' README.md`
Expected: deployment docs do not yet describe Coolify as the primary production path.

**Step 5: Commit audit-ready notes**

```bash
git add docs/plans/2026-06-30-coolify-vps-migration-design.md docs/plans/2026-06-30-coolify-vps-migration.md
git commit -m "docs: add coolify migration design and plan"
```

### Task 2: Make Root Compose Public-URL Driven

**Files:**
- Modify: `docker-compose.yaml`
- Test: `docker compose config`

**Step 1: Write the failing configuration expectation**

Manually verify the compose file cannot be reused safely for production because backend CORS and admin API URL are hardcoded to localhost.

**Step 2: Replace backend CORS with env-backed configuration**

Change `CORS_ORIGIN` in `backend.environment` to read from a root-level env variable such as `${CORS_ORIGIN}`.

**Step 3: Replace admin public API build arg with env-backed configuration**

Change `NEXT_PUBLIC_API_BASE_URL` in `admin-ui.build.args` to read from `${API_BASE_URL}`.

**Step 4: Preserve internal networking assumptions**

Keep backend DB connection values pointing at `postgres` and port `5432` within the compose network.

**Step 5: Validate rendered compose**

Run: `docker compose config`
Expected: rendered output resolves env placeholders cleanly and keeps the three-service stack intact.

**Step 6: Commit**

```bash
git add docker-compose.yaml
git commit -m "chore: parameterize root compose for coolify"
```

### Task 3: Expand Root Environment Documentation

**Files:**
- Modify: `.env.example`

**Step 1: Add public deployment URL variables**

Document:
- `API_BASE_URL`
- `ADMIN_BASE_URL`
- `CORS_ORIGIN`

Use temporary Coolify-subdomain examples rather than localhost-only values.

**Step 2: Keep local development intent clear**

Retain DB/JWT/Firebase sections and make it obvious that `.env.example` documents both local and deployment-facing variables.

**Step 3: Align root env doc with compose usage**

Ensure every env variable referenced by `docker-compose.yaml` is documented in `.env.example`.

**Step 4: Review rendered diff**

Run: `git diff -- .env.example`
Expected: env docs now include the public URL contract needed by Coolify.

**Step 5: Commit**

```bash
git add .env.example
git commit -m "docs: document coolify deployment env contract"
```

### Task 4: Update Deployment Documentation

**Files:**
- Modify: `README.md`

**Step 1: Add a production deployment section**

Describe the root compose stack as the Coolify deployment entrypoint.

**Step 2: Document Coolify-specific setup**

Include:
- one Coolify Docker Compose app from repo root
- one public domain for backend
- one public domain for admin
- internal-only Postgres
- env vars configured in Coolify

**Step 3: Document post-deploy migration step**

Add the exact migration command to run from the backend container after the first deploy.

**Step 4: Document provider-console follow-up**

Call out Firebase authorized domains and any OAuth domain updates required after assigning temporary Coolify subdomains.

**Step 5: Review rendered diff**

Run: `git diff -- README.md`
Expected: README now documents Coolify as the current production path without removing local-dev instructions.

**Step 6: Commit**

```bash
git add README.md
git commit -m "docs: add coolify deployment guide"
```

### Task 5: Verify Admin Build Expectations

**Files:**
- Review: `admin-ui/Dockerfile`
- Review: `admin-ui/package.json`
- Review: `admin-ui/next.config.*`

**Step 1: Confirm Docker build arg usage**

Run: `rg -n "NEXT_PUBLIC_API_BASE_URL|ARG|ENV" admin-ui/Dockerfile admin-ui`
Expected: admin image build consumes `NEXT_PUBLIC_API_BASE_URL` in a way compatible with Coolify builds.

**Step 2: Confirm no hidden path-prefix assumptions**

Run: `rg -n "basePath|assetPrefix" admin-ui`
Expected: either no base-path support exists yet or it is explicitly configured.

**Step 3: Record follow-up risk**

If `basePath` is absent, note that the later move to `paz.church/curitiba` may require a separate admin change.

**Step 4: Commit notes only if docs changed**

```bash
git add README.md docs/plans/2026-06-30-coolify-vps-migration-design.md docs/plans/2026-06-30-coolify-vps-migration.md
git commit -m "docs: record admin deployment constraints"
```

### Task 6: Local Configuration Verification

**Files:**
- Test: `docker-compose.yaml`
- Test: `.env.example`

**Step 1: Prepare a local env file for config-only validation**

Create a temporary `.env` from `.env.example` with placeholder non-secret values if needed for compose rendering.

**Step 2: Validate compose resolution**

Run: `docker compose config`
Expected: compose renders without missing-variable errors.

**Step 3: Optionally build-check if local toolchain is ready**

Run: `docker compose build backend admin-ui`
Expected: both images build, or any failure clearly points to application-level issues rather than compose wiring.

**Step 4: Capture blockers explicitly**

If builds are skipped or fail due to missing local prerequisites, record that in the final execution notes.

**Step 5: Commit only if task introduced tracked file changes**

```bash
git add docker-compose.yaml .env.example README.md
git commit -m "chore: verify coolify-ready compose configuration"
```

### Task 7: Coolify Deployment Runbook

**Files:**
- Modify: `README.md`
- Optionally Create: `docs/plans/2026-06-30-coolify-vps-smoke-test.md`

**Step 1: Document the exact Coolify resource creation flow**

Include:
- create Docker Compose app from repo root
- point to repository
- configure env vars
- assign temp domains to backend and admin services

**Step 2: Document the first-deploy sequence**

Include:
- deploy stack
- wait for health
- run backend migration command
- verify admin loads
- verify backend API responds

**Step 3: Document smoke tests**

Include:
- admin page load
- API call from admin
- auth flow
- DB-backed endpoint

**Step 4: Document rollback posture**

If deployment fails, revert Coolify env/domain changes first before editing app code.

**Step 5: Commit**

```bash
git add README.md docs/plans/2026-06-30-coolify-vps-smoke-test.md
git commit -m "docs: add coolify smoke test runbook"
```
