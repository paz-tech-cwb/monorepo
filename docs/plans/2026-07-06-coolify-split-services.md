# Coolify Split Services Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move production deployment from one root Docker Compose Coolify resource to separate Coolify resources for PostgreSQL, backend, and web, using temporary Coolify URLs first.

**Architecture:** Coolify owns the production topology: one managed PostgreSQL database resource, one Dockerfile app from `backend/`, and one Dockerfile app from `admin-ui/`. Local development remains source-first: local PostgreSQL from `backend/docker-compose.yaml`, backend dev server on `3001`, and admin dev server on `3000`.

**Tech Stack:** Coolify, PostgreSQL 16, Dockerfile build pack, NestJS 11, TypeORM, Next.js 15, Firebase Auth

---

### Task 1: Confirm Current Repo State And Protect Existing Work

**Files:**
- Review: `docker-compose.yaml`
- Review: `backend/Dockerfile`
- Review: `admin-ui/Dockerfile`
- Review: `backend/.env.example`
- Review: `admin-ui/.env.local.example`
- Review: `package.json`

**Step 1: Check dirty worktree**

Run:

```bash
git status --short
git submodule status
```

Expected: note any existing dirty submodules or untracked files. Do not revert or stage unrelated changes.

**Step 2: Confirm backend Dockerfile port**

Run:

```bash
sed -n '1,160p' backend/Dockerfile
```

Expected: backend exposes `3001` and starts `node dist/src/main.js`.

**Step 3: Confirm web Dockerfile port and build args**

Run:

```bash
rg -n "NEXT_PUBLIC_API_BASE_URL|EXPOSE|CMD|ARG|ENV" admin-ui/Dockerfile
```

Expected: web exposes `3000` and accepts `NEXT_PUBLIC_API_BASE_URL` as a build arg/env.

**Step 4: Confirm local dev scripts**

Run:

```bash
sed -n '1,180p' package.json
sed -n '1,120p' backend/docker-compose.yaml
```

Expected: `npm run db` starts local PostgreSQL from `backend/docker-compose.yaml`; `npm run dev` starts backend/admin locally.

### Task 2: Create Coolify PostgreSQL Resource

**Files:**
- No repo file changes.

**Step 1: Create database in Coolify**

In Coolify:

```text
New Resource -> Database -> PostgreSQL
Name: church-db
Version: PostgreSQL 16
Public access: disabled
```

Expected: Coolify creates a private PostgreSQL database with persistent storage.

**Step 2: Record connection values**

Capture the Coolify-provided values:

```bash
DB_HOST=
DB_PORT=5432
DB_USERNAME=
DB_PASSWORD=
DB_NAME=
```

Expected: values are available for `church-api` env configuration. Do not commit secrets.

**Step 3: Verify database health**

Use the Coolify database resource status/logs.

Expected: database is healthy before deploying backend.

### Task 3: Deploy Backend As Its Own Coolify Application

**Files:**
- Review: `backend/.env.example`
- Review: `backend/src/main.ts`
- Review: `backend/src/configs/orm.config.ts`

**Step 1: Create backend app**

In Coolify:

```text
New Resource -> Application -> Git Repository
Name: church-api
Base directory: backend
Build pack: Dockerfile
Dockerfile: Dockerfile
Port: 3001
```

Expected: Coolify builds from `backend/Dockerfile` and routes to container port `3001`.

**Step 2: Add backend env vars**

Set:

```bash
DB_HOST=<church-db private host>
DB_PORT=5432
DB_USERNAME=<church-db user>
DB_PASSWORD=<church-db password>
DB_NAME=<church-db database>
DB_SYNCHRONIZE=false
DB_LOGGING=false
ACCESS_TOKEN_SECRET=<32+ chars>
REFRESH_TOKEN_SECRET=<32+ chars>
GOOGLE_CLIENT_ID=<google oauth client id>
PORT=3001
CORS_ORIGIN=https://<church-web-temp-url-placeholder>
FIREBASE_PROJECT_ID=<firebase admin project id>
FIREBASE_CLIENT_EMAIL=<firebase admin client email>
FIREBASE_PRIVATE_KEY=<firebase admin private key>
RESEND_API_KEY=<optional>
RESEND_FROM_EMAIL=<sender email>
TWILIO_ACCOUNT_SID=<optional>
TWILIO_AUTH_TOKEN=<optional>
TWILIO_FROM_NUMBER=<optional>
META_WHATSAPP_TOKEN=<optional>
META_WHATSAPP_PHONE_NUMBER_ID=<optional>
```

Expected: all required runtime env vars are present. If the web URL does not exist yet, use a temporary value and return to update `CORS_ORIGIN` after Task 4 creates the web app.

**Step 3: Assign temporary backend URL**

Use Coolify generated domain or assign a temporary domain.

Expected shape:

```bash
https://<church-api-temp-url>
```

The API base URL for clients is:

```bash
https://<church-api-temp-url>/api
```

**Step 4: Deploy backend**

Run deployment from Coolify.

Expected: container builds, starts, and listens on port `3001`.

**Step 5: Smoke test backend**

From a terminal:

```bash
curl -i https://<church-api-temp-url>/api
```

Expected: any backend HTTP response proves routing reaches the Nest app. A `404` is acceptable if `/api` has no root route; connection failures are not acceptable.

### Task 4: Run Production Migrations

**Files:**
- Review: `backend/package.json`

**Step 1: Open Coolify terminal for `church-api`**

Use the running backend container terminal.

Expected: shell is inside the backend app container.

**Step 2: Run migrations**

Run:

```bash
npm run migration:run
```

Expected: TypeORM applies pending migrations successfully.

**Step 3: If migrations fail, stop and capture the error**

Run:

```bash
env | sort | grep '^DB_'
```

Expected: DB env values are present. Do not print or share secrets outside the secure context.

### Task 5: Deploy Web As Its Own Coolify Application

**Files:**
- Review: `admin-ui/Dockerfile`
- Review: `admin-ui/.env.local.example`
- Review: `admin-ui/lib/api/config.ts`

**Step 1: Create web app**

In Coolify:

```text
New Resource -> Application -> Git Repository
Name: church-web
Base directory: admin-ui
Build pack: Dockerfile
Dockerfile: Dockerfile
Port: 3000
```

Expected: Coolify builds from `admin-ui/Dockerfile` and routes to container port `3000`.

**Step 2: Assign temporary web URL**

Use Coolify generated domain or assign a temporary domain.

Expected shape:

```bash
https://<church-web-temp-url>
```

**Step 3: Add web env/build vars**

Set:

```bash
NEXT_PUBLIC_API_BASE_URL=https://<church-api-temp-url>/api
NEXT_PUBLIC_FIREBASE_API_KEY=<firebase public key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<firebase auth domain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<firebase project id>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<firebase storage bucket>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<firebase sender id>
NEXT_PUBLIC_FIREBASE_APP_ID=<firebase app id>
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=<firebase measurement id>
```

Expected: `NEXT_PUBLIC_API_BASE_URL` points to the backend temporary URL with `/api`.

**Step 4: Deploy web**

Run deployment from Coolify.

Expected: container builds, starts, and listens on port `3000`.

**Step 5: Verify browser API target**

Open the web temporary URL in a browser, then inspect network requests.

Expected: requests go to `https://<church-api-temp-url>/api`, not `localhost`.

### Task 6: Finalize Cross-Service URL Configuration

**Files:**
- No repo file changes.

**Step 1: Update backend CORS**

In `church-api` env, set:

```bash
CORS_ORIGIN=https://<church-web-temp-url>
```

Expected: backend allows browser requests from the deployed web app.

**Step 2: Redeploy or restart backend**

Use Coolify to redeploy/restart `church-api`.

Expected: backend picks up the final web temporary URL.

**Step 3: Rebuild web if API URL changed**

If the backend temporary URL changed after the previous web build, redeploy `church-web`.

Expected: the rebuilt client bundle embeds the current API base URL.

### Task 7: Configure Firebase And OAuth Temporary Domains

**Files:**
- No repo file changes.

**Step 1: Add web temporary URL to Firebase authorized domains**

In Firebase Console, add:

```bash
<church-web-temp-url host>
```

Expected: Firebase Auth allows login from the deployed web URL.

**Step 2: Verify Google OAuth settings**

Confirm the temporary web URL is accepted by the current Google auth setup.

Expected: Google login can return to the deployed web app.

**Step 3: Check Apple only if enabled**

If Apple login is enabled for this environment, verify its domain/app identity settings separately.

Expected: Apple is either confirmed working or explicitly marked as deferred.

### Task 8: End-To-End Production Smoke Test

**Files:**
- No repo file changes.

**Step 1: Open web URL**

Visit:

```bash
https://<church-web-temp-url>
```

Expected: admin UI loads.

**Step 2: Sign in**

Use the supported login flow.

Expected: Firebase login succeeds and backend `/api/auth/social-login` returns app tokens.

**Step 3: Test one authenticated API workflow**

Use an existing admin screen that reads DB-backed data.

Expected: request succeeds with no CORS error and no `localhost` request.

**Step 4: Confirm backend logs**

In Coolify logs for `church-api`, confirm no repeated DB/auth/config errors.

Expected: logs are clean enough for production trial.

### Task 9: Update Repository Docs To Match New Production Path

**Files:**
- Modify: `README.md`
- Modify: `.env.example`
- Optionally Modify: `docker-compose.yaml`

**Step 1: Update README production section**

Change the production guidance from root compose deployment to separate Coolify resources:

```text
Production uses three Coolify resources:
- church-db: PostgreSQL
- church-api: backend Dockerfile app
- church-web: admin-ui Dockerfile app
```

Expected: README no longer presents root compose as the preferred production entrypoint.

**Step 2: Preserve local development instructions**

Keep local commands centered on:

```bash
npm run db
npm run dev
```

Expected: local setup remains simple.

**Step 3: Update env examples**

Ensure `.env.example`, `backend/.env.example`, and `admin-ui/.env.local.example` clearly separate local values from production Coolify values.

Expected: no production secrets are committed.

**Step 4: Decide root compose status**

Either:

```text
Option A: keep root docker-compose.yaml as an optional all-in-one container reference
Option B: rename/document it as legacy and remove it from production docs
```

Expected: there is no ambiguity about which path production should use.

**Step 5: Validate docs diff**

Run:

```bash
git diff -- README.md .env.example backend/.env.example admin-ui/.env.local.example docker-compose.yaml
```

Expected: docs/config changes match the split-service plan only.

### Task 10: Commit Plan And Docs Changes

**Files:**
- Stage only files changed for this migration plan/docs work.

**Step 1: Review status**

Run:

```bash
git status --short
```

Expected: unrelated dirty submodules are still unstaged.

**Step 2: Stage intended docs**

Run:

```bash
git add docs/plans/2026-07-06-coolify-split-services-design.md docs/plans/2026-07-06-coolify-split-services.md
```

Expected: only the new plan docs are staged.

**Step 3: Commit**

Run:

```bash
git commit -m "docs: plan split coolify services deployment"
```

Expected: commit contains only the new design and implementation plan unless later doc updates were explicitly approved.
