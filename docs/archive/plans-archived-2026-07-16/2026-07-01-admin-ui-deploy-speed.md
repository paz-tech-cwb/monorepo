# Admin UI Deploy Speed Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce `admin-ui` staging deploy time in Coolify and harden the same path for future production by making Docker builds deterministic, smaller, and more cache-friendly.

**Architecture:** Convert the Next.js app to standalone output so the runtime image copies prebuilt artifacts instead of reinstalling production dependencies. Remove only clearly unrelated and unused cross-framework packages from `admin-ui/package.json`, regenerate the lockfile, and restore `pnpm install --frozen-lockfile` in Docker to keep builds reproducible.

**Tech Stack:** Next.js 15 standalone output, pnpm 9, Docker multi-stage builds, Coolify Docker Compose deployment

---

### Task 1: Enable standalone Next.js output

**Files:**
- Modify: `admin-ui/next.config.mjs`
- Test: `admin-ui/.next/standalone/server.js` (generated)

**Step 1: Add standalone output to Next config**

Set `output: "standalone"` in `admin-ui/next.config.mjs` while keeping the existing build-tolerance settings unchanged.

**Step 2: Run the app build**

Run: `pnpm build`
Expected: a successful Next.js production build

**Step 3: Verify standalone artifacts exist**

Run: `test -f .next/standalone/server.js && echo ok`
Expected: `ok`

**Step 4: Commit**

```bash
git add next.config.mjs
git commit -m "build: enable standalone output"
```

### Task 2: Remove clearly unrelated unused dependencies

**Files:**
- Modify: `admin-ui/package.json`
- Modify: `admin-ui/pnpm-lock.yaml`
- Test: `admin-ui/package.json`

**Step 1: Remove unused cross-framework packages**

Delete these dependencies from `admin-ui/package.json` because static search shows no runtime imports in this app:

- `@remix-run/react`
- `@sveltejs/kit`
- `svelte`
- `vue`
- `vue-router`

**Step 2: Regenerate the lockfile**

Run: `pnpm install --lockfile-only`
Expected: `pnpm-lock.yaml` updates without adding back the removed packages

**Step 3: Verify they are gone**

Run: `rg -n "@remix-run/react|@sveltejs/kit|^  svelte:|^  vue:|vue-router" pnpm-lock.yaml package.json`
Expected: no hits in `package.json`; no top-level dependency entries in `pnpm-lock.yaml`

**Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "build: remove unused cross-framework dependencies"
```

### Task 3: Rework Docker for deterministic standalone builds

**Files:**
- Modify: `admin-ui/Dockerfile`
- Test: `admin-ui/Dockerfile`

**Step 1: Split Dockerfile into cache-friendly stages**

Create:
- a `deps` stage that installs dependencies with `pnpm install --frozen-lockfile`
- a `builder` stage that copies source and runs `pnpm run build`
- a `runner` stage that copies only standalone artifacts plus `public`

**Step 2: Remove the second runtime install**

Do not run `pnpm install --prod` in the final image. Start the standalone server directly with Node.

**Step 3: Keep build-time public env wiring**

Preserve the existing `NEXT_PUBLIC_*` build args and env export so Coolify still bakes the public config into the bundle.

**Step 4: Verify the Dockerfile contract**

Run: `sed -n '1,240p' Dockerfile`
Expected: only one dependency install path, `--frozen-lockfile`, standalone artifact copies, and a direct Node start command

**Step 5: Commit**

```bash
git add Dockerfile
git commit -m "build: optimize docker image for standalone next"
```

### Task 4: Verify deterministic local build behavior

**Files:**
- Test: `admin-ui/package.json`
- Test: `admin-ui/pnpm-lock.yaml`
- Test: `admin-ui/Dockerfile`

**Step 1: Verify lockfile consistency**

Run: `pnpm install --frozen-lockfile`
Expected: install completes without lockfile mutation

**Step 2: Verify app build**

Run: `pnpm build`
Expected: successful production build

**Step 3: Verify Docker build**

Run: `docker build -t paz-admin-ui-deploy-speed-test .`
Expected: image builds successfully and finishes with the standalone runner image

**Step 4: Verify runtime entrypoint**

Run: `docker run --rm -p 3000:3000 paz-admin-ui-deploy-speed-test`
Expected: container starts with the standalone server without reinstalling dependencies

**Step 5: Commit**

```bash
git add .
git commit -m "test: verify optimized admin-ui deploy path"
```

### Task 5: Update root submodule pointer after admin-ui changes

**Files:**
- Modify: `admin-ui` (submodule pointer in root repo)

**Step 1: Record the new admin-ui submodule commit in the root repo**

Run: `git add admin-ui`
Expected: root repo stages the updated submodule pointer only

**Step 2: Commit the pointer update**

```bash
git commit -m "chore: update admin-ui submodule for deploy speed"
```

**Step 3: Verify root diff scope**

Run: `git diff --stat origin/main...HEAD`
Expected: only the intended root plan file and `admin-ui` submodule pointer updates appear
