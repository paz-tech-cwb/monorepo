# Monorepo Consolidation + CI/CD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fold `admin-ui`, `backend`, and `kmp-mobile` from git submodules into real folders in
the `church`/`paz-tech-cwb/monorepo` repo (preserving history), drop `mobile-app` and
`postman-files`, and add path-filtered GitHub Actions CI/deploy workflows so pushing to `main`
deploys only the app(s) that actually changed.

**Architecture:** Each submodule is converted via `git submodule deinit` + `git subtree add`
(full history, no squash) so the monorepo ends up with zero submodules and full commit history
per folder. New root-level `.github/workflows/` files use `paths:` filters to scope PR CI and
production deploys per folder; deploy workflows call a shared composite action that SSHes to
the VPS and runs `coolify-guarded-deploy`, gated behind a `DEPLOYS_ENABLED` repository variable
that defaults off.

**Tech Stack:** git subtree, GitHub Actions, `gh` CLI, `coolify-guarded-deploy` (VPS-side
script, invoked over SSH), Node/pnpm (admin-ui), Node/npm (backend), Gradle/Xcode (kmp-mobile).

## Global Constraints

- Preserve full git history for admin-ui, backend, kmp-mobile (`git subtree`, no squash) — spec section "Repo consolidation".
- No history import needed for mobile-app/postman-files — spec section "Repo consolidation".
- Archive (not delete) `paz-tech-cwb/mobile-app` and `paz-tech-cwb/postman-files` on GitHub — spec section "Repo consolidation".
- Single `develop` → `main` branch model for the whole monorepo; no new commits/tags to backend's old `master` or `release/church-*` — spec section "Branching model".
- All new workflow files live at the monorepo root `.github/workflows/`, path-filtered by folder — spec section "CI/CD workflows".
- Deploy workflows (`deploy-admin-ui.yml`, `deploy-backend.yml`) must be gated off by default (`DEPLOYS_ENABLED` repo variable) — spec section "CI/CD workflows".
- SSH key/secret creation is a manual, user-owned action — NOT part of any task below — spec section "Secrets / manual prerequisites".
- Coolify app names: `paz-curitiba-admin-ui` (admin-ui), `paz-curitiba-api` (backend) — spec section "CI/CD workflows".
- VPS host: `root@62.238.45.195` — spec section "Secrets / manual prerequisites".

---

## File Structure

```
church/                                   (repo root, remote paz-tech-cwb/monorepo)
├── .gitmodules                           (modified: entries removed for all 5 submodules)
├── admin-ui/                             (was submodule → real folder, full history)
├── backend/                              (was submodule → real folder, full history)
├── kmp-mobile/                           (was submodule → real folder, full history)
│   └── .github/workflows/                (old android-ci.yml/ios-ci.yml removed, content moved to root)
├── .github/
│   ├── actions/
│   │   └── coolify-deploy/
│   │       └── action.yml                (new: shared composite action)
│   └── workflows/
│       ├── ci-admin-ui.yml               (new: PR lint/build, path-filtered)
│       ├── ci-backend.yml                (new: PR lint/build/test, path-filtered)
│       ├── ci-kmp-mobile.yml             (new: PR android+ios build/test, path-filtered)
│       ├── deploy-admin-ui.yml           (new: push-to-main deploy, gated)
│       └── deploy-backend.yml            (new: push-to-main deploy, gated)
├── .ai/
│   ├── architecture.md                   (modified: drop mobile-app/postman-files refs)
│   └── project.md                        (modified: drop mobile-app/postman-files refs)
```

`mobile-app/` and `postman-files/` folders are removed entirely (submodule deinit, no
replacement folder).

---

### Task 1: Remove `mobile-app` and `postman-files` submodules, archive their GitHub repos

**Files:**
- Modify: `.gitmodules`
- Delete: `mobile-app/` (submodule working tree), `postman-files/` (submodule working tree)
- Modify: `.git/config` (submodule section removed automatically by `git submodule deinit`)

**Interfaces:** None (this task has no code interfaces — it's pure repo surgery, produces a
repo state with these two paths gone, which later doc-update tasks depend on).

- [ ] **Step 1: Confirm current branch and clean working tree**

Run: `git status`
Expected: working tree clean, on `develop` (or a fresh branch cut from `develop` if you prefer
to review this as its own PR — either is fine, but do not do this work on `main` directly).

- [ ] **Step 2: Deinit and remove the two submodules**

```bash
git submodule deinit -f mobile-app postman-files
git rm -f mobile-app postman-files
rm -rf .git/modules/mobile-app .git/modules/postman-files
```

- [ ] **Step 3: Remove their entries from `.gitmodules`**

Edit `.gitmodules` and delete these two blocks:

```
[submodule "mobile-app"]
	path = mobile-app
	url = https://github.com/paz-tech-cwb/mobile-app
[submodule "postman-files"]
	path = postman-files
	url = https://github.com/paz-tech-cwb/postman-files
```

- [ ] **Step 4: Verify removal**

Run: `git status && cat .gitmodules`
Expected: `mobile-app` and `postman-files` no longer appear anywhere in `git status` or
`.gitmodules`; only `admin-ui`, `backend`, `kmp-mobile` submodule blocks remain in
`.gitmodules` (they get removed in Tasks 2-4, not here).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: drop mobile-app and postman-files submodules"
```

- [ ] **Step 6: Archive the standalone GitHub repos**

```bash
gh repo archive paz-tech-cwb/mobile-app --yes
gh repo archive paz-tech-cwb/postman-files --yes
```

Expected: both commands report the repos are now archived. Verify with
`gh repo view paz-tech-cwb/mobile-app --json isArchived` and the postman-files equivalent —
both should print `"isArchived": true`.

---

### Task 2: Subtree-import `backend` with full history

**Files:**
- Modify: `.gitmodules` (backend block removed)
- Create: `backend/` (as a real, tracked folder — not a submodule pointer)

**Interfaces:** None (repo surgery task).

- [ ] **Step 1: Note the current submodule commit for reference**

Run: `git -C backend rev-parse HEAD` and record the output — this is the exact commit backend
was pinned to before conversion, useful if you need to sanity-check the subtree import matched.

- [ ] **Step 2: Deinit the backend submodule**

```bash
git submodule deinit -f backend
git rm -f backend
rm -rf .git/modules/backend
```

- [ ] **Step 3: Remove the backend block from `.gitmodules`**

Delete:
```
[submodule "backend"]
	path = backend
	url = https://github.com/paz-tech-cwb/backend
```

- [ ] **Step 4: Commit the removal before importing (keeps history clean/bisectable)**

```bash
git add -A
git commit -m "chore: deinit backend submodule ahead of subtree import"
```

- [ ] **Step 5: Add a remote for backend and fetch it**

```bash
git remote add backend-import https://github.com/paz-tech-cwb/backend
git fetch backend-import develop
```

Expected: fetch succeeds, prints the objects retrieved.

- [ ] **Step 6: Subtree-import backend's `develop` branch into `backend/`, preserving history**

```bash
git subtree add --prefix=backend backend-import develop
```

Expected: this creates a merge commit; `git log --oneline -1` shows a message like
"Add 'backend/' from commit '<sha>'".

- [ ] **Step 7: Verify history is preserved**

Run: `git log --follow --oneline -- backend/package.json | head -5`
Expected: shows multiple historical commits (not just the single merge commit), confirming
backend's original history is reachable under the `backend/` path.

- [ ] **Step 8: Remove the temporary remote**

```bash
git remote remove backend-import
```

- [ ] **Step 9: Verify the working tree looks right**

Run: `ls backend/ && cat backend/package.json | head -5`
Expected: backend's files are present as a normal tracked folder (no `.git` file/pointer
inside it — `ls -la backend/.git` should report "No such file or directory").

---

### Task 3: Subtree-import `admin-ui` with full history

**Files:**
- Modify: `.gitmodules` (admin-ui block removed)
- Create: `admin-ui/` (as a real, tracked folder)

**Interfaces:** None (repo surgery task, same pattern as Task 2).

- [ ] **Step 1: Deinit the admin-ui submodule**

```bash
git submodule deinit -f admin-ui
git rm -f admin-ui
rm -rf .git/modules/admin-ui
```

- [ ] **Step 2: Remove the admin-ui block from `.gitmodules`**

Delete:
```
[submodule "admin-ui"]
	path = admin-ui
	url = https://github.com/paz-tech-cwb/admin-ui
```

- [ ] **Step 3: Commit the removal**

```bash
git add -A
git commit -m "chore: deinit admin-ui submodule ahead of subtree import"
```

- [ ] **Step 4: Add a remote for admin-ui and fetch it**

```bash
git remote add admin-ui-import https://github.com/paz-tech-cwb/admin-ui
git fetch admin-ui-import develop
```

- [ ] **Step 5: Subtree-import admin-ui's `develop` branch into `admin-ui/`**

```bash
git subtree add --prefix=admin-ui admin-ui-import develop
```

- [ ] **Step 6: Verify history is preserved**

Run: `git log --follow --oneline -- admin-ui/package.json | head -5`
Expected: multiple historical commits show up under `admin-ui/`.

- [ ] **Step 7: Remove the temporary remote**

```bash
git remote remove admin-ui-import
```

- [ ] **Step 8: Verify the working tree**

Run: `ls admin-ui/ && cat admin-ui/package.json | head -5`
Expected: normal tracked folder, no nested `.git`.

---

### Task 4: Subtree-import `kmp-mobile` with full history

**Files:**
- Modify: `.gitmodules` (kmp-mobile block removed)
- Create: `kmp-mobile/` (as a real, tracked folder, including its existing
  `kmp-mobile/.github/workflows/android-ci.yml` and `ios-ci.yml`)

**Interfaces:** Produces `kmp-mobile/.github/workflows/android-ci.yml` and
`kmp-mobile/.github/workflows/ios-ci.yml` at their original paths — Task 7 reads these exact
files (verbatim job steps) when creating the root-level `ci-kmp-mobile.yml`.

- [ ] **Step 1: Deinit the kmp-mobile submodule**

```bash
git submodule deinit -f kmp-mobile
git rm -f kmp-mobile
rm -rf .git/modules/kmp-mobile
```

- [ ] **Step 2: Remove the kmp-mobile block from `.gitmodules`**

Delete:
```
[submodule "kmp-mobile"]
	path = kmp-mobile
	url = https://github.com/paz-tech-cwb/kmp-mobile.git
```

Note: after this, `.gitmodules` should have no remaining submodule blocks at all. Verify with
`cat .gitmodules` — if the file is now empty, delete it entirely (`git rm .gitmodules`) since an
empty `.gitmodules` is dead weight.

- [ ] **Step 3: Commit the removal**

```bash
git add -A
git commit -m "chore: deinit kmp-mobile submodule ahead of subtree import"
```

- [ ] **Step 4: Add a remote for kmp-mobile and fetch it**

```bash
git remote add kmp-mobile-import https://github.com/paz-tech-cwb/kmp-mobile.git
git fetch kmp-mobile-import develop
```

- [ ] **Step 5: Subtree-import kmp-mobile's `develop` branch into `kmp-mobile/`**

```bash
git subtree add --prefix=kmp-mobile kmp-mobile-import develop
```

- [ ] **Step 6: Verify history is preserved**

Run: `git log --follow --oneline -- kmp-mobile/settings.gradle.kts | head -5`
(adjust filename if `settings.gradle.kts` doesn't exist — use any long-lived tracked file in
kmp-mobile's root)
Expected: multiple historical commits under `kmp-mobile/`.

- [ ] **Step 7: Remove the temporary remote**

```bash
git remote remove kmp-mobile-import
```

- [ ] **Step 8: Verify the moved-in CI files are present**

Run: `ls kmp-mobile/.github/workflows/`
Expected: `android-ci.yml` and `ios-ci.yml` are present at this path — Task 7 needs them here.

---

### Task 5: Add composite action for Coolify deploy

**Files:**
- Create: `.github/actions/coolify-deploy/action.yml`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: a reusable composite action `uses: ./.github/actions/coolify-deploy` with input
  `app-name` (string, required) — Tasks 8 and 9 (`deploy-admin-ui.yml`, `deploy-backend.yml`)
  call this action with `app-name: paz-curitiba-admin-ui` and `app-name: paz-curitiba-api`
  respectively. It also requires two secrets, referenced by the caller workflow, not by the
  action itself: `VPS_SSH_KEY` (private key) and `VPS_SSH_HOST` is hardcoded to
  `root@62.238.45.195` per the Global Constraints.

- [ ] **Step 1: Create the composite action directory and file**

Create `.github/actions/coolify-deploy/action.yml`:

```yaml
name: 'Coolify Guarded Deploy'
description: 'SSH into the VPS and run coolify-guarded-deploy for a given app'
inputs:
  app-name:
    description: 'Coolify application name or UUID to deploy'
    required: true
  ssh-private-key:
    description: 'SSH private key with access to the VPS'
    required: true
runs:
  using: 'composite'
  steps:
    - name: Configure SSH
      shell: bash
      run: |
        mkdir -p ~/.ssh
        printf '%s\n' "${{ inputs.ssh-private-key }}" > ~/.ssh/deploy_key
        chmod 600 ~/.ssh/deploy_key
        ssh-keyscan -H 62.238.45.195 >> ~/.ssh/known_hosts

    - name: Run coolify-guarded-deploy
      shell: bash
      run: |
        ssh -i ~/.ssh/deploy_key root@62.238.45.195 \
          "coolify-guarded-deploy '${{ inputs.app-name }}'"

    - name: Clean up SSH key
      if: always()
      shell: bash
      run: rm -f ~/.ssh/deploy_key
```

- [ ] **Step 2: Validate YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/actions/coolify-deploy/action.yml'))"`
Expected: no output (no exception) — confirms valid YAML.

- [ ] **Step 3: Commit**

```bash
git add .github/actions/coolify-deploy/action.yml
git commit -m "ci: add shared coolify-guarded-deploy composite action"
```

---

### Task 6: Add `ci-admin-ui.yml` (PR CI)

**Files:**
- Create: `.github/workflows/ci-admin-ui.yml`

**Interfaces:** None consumed. Produces a workflow named "Admin UI CI" — no other task depends
on its internals, only on it existing at this path.

- [ ] **Step 1: Create the workflow file**

Create `.github/workflows/ci-admin-ui.yml`:

```yaml
name: Admin UI CI

on:
  pull_request:
    branches: [develop, main]
    paths:
      - 'admin-ui/**'
      - '.github/workflows/ci-admin-ui.yml'

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: admin-ui
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9.15.9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: admin-ui/pnpm-lock.yaml

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Build
        run: pnpm build
```

- [ ] **Step 2: Validate YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci-admin-ui.yml'))"`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci-admin-ui.yml
git commit -m "ci: add path-filtered PR CI for admin-ui"
```

---

### Task 7: Add `ci-backend.yml` (PR CI)

**Files:**
- Create: `.github/workflows/ci-backend.yml`

**Interfaces:** None consumed. Produces a workflow named "Backend CI" at this path.

- [ ] **Step 1: Create the workflow file**

Create `.github/workflows/ci-backend.yml`:

```yaml
name: Backend CI

on:
  pull_request:
    branches: [develop, main]
    paths:
      - 'backend/**'
      - '.github/workflows/ci-backend.yml'

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build

      - name: Test
        run: npm test
```

- [ ] **Step 2: Validate YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci-backend.yml'))"`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci-backend.yml
git commit -m "ci: add path-filtered PR CI for backend"
```

---

### Task 8: Move kmp-mobile CI to root as `ci-kmp-mobile.yml`, path-filtered

**Files:**
- Create: `.github/workflows/ci-kmp-mobile.yml`
- Delete: `kmp-mobile/.github/workflows/android-ci.yml`, `kmp-mobile/.github/workflows/ios-ci.yml`

**Interfaces:**
- Consumes: the exact job steps from `kmp-mobile/.github/workflows/android-ci.yml` and
  `kmp-mobile/.github/workflows/ios-ci.yml` (imported in Task 4), adapted only by prefixing
  Gradle/Xcode invocation paths with `kmp-mobile/` and moving the trigger to path-filtered.
- Produces: a single workflow file with two jobs (`android`, `ios`) — no other task depends on
  its internals.

- [ ] **Step 1: Create the merged, path-filtered workflow file**

Create `.github/workflows/ci-kmp-mobile.yml`:

```yaml
name: KMP Mobile CI

on:
  pull_request:
    branches: [develop, main]
    paths:
      - 'kmp-mobile/**'
      - '.github/workflows/ci-kmp-mobile.yml'

permissions:
  contents: read

jobs:
  android:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    defaults:
      run:
        working-directory: kmp-mobile
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17

      - uses: gradle/actions/setup-gradle@v4

      - name: Build shared (all targets)
        run: ./gradlew :shared:assemble

      - name: Build Android debug APK
        run: ./gradlew :android:assembleDebug

      - name: Run shared unit tests
        run: ./gradlew :shared:allTests

      - name: Run Android unit tests
        run: ./gradlew :android:testDebugUnitTest

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: android-test-results
          path: 'kmp-mobile/**/build/reports/tests/**'

  ios:
    runs-on: macos-15
    timeout-minutes: 45
    defaults:
      run:
        working-directory: kmp-mobile
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17

      - uses: gradle/actions/setup-gradle@v4

      - name: Build KMP XCFramework
        run: ./gradlew :shared:assembleXCFramework

      - name: Build iOS app
        run: |
          xcodebuild \
            -project ios/PazChurch.xcodeproj \
            -scheme PazChurch \
            -destination 'platform=iOS Simulator,name=iPhone 16,OS=latest' \
            -configuration Debug \
            CODE_SIGN_IDENTITY="" \
            CODE_SIGNING_REQUIRED=NO \
            build

      - name: Run iOS unit tests
        run: |
          xcodebuild \
            -project ios/PazChurch.xcodeproj \
            -scheme PazChurch \
            -destination 'platform=iOS Simulator,name=iPhone 16,OS=latest' \
            -configuration Debug \
            CODE_SIGN_IDENTITY="" \
            CODE_SIGNING_REQUIRED=NO \
            test
```

- [ ] **Step 2: Validate YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci-kmp-mobile.yml'))"`
Expected: no output.

- [ ] **Step 3: Remove the old in-folder CI files**

```bash
git rm kmp-mobile/.github/workflows/android-ci.yml kmp-mobile/.github/workflows/ios-ci.yml
```

If `kmp-mobile/.github/workflows/` is now empty, also remove the empty directories (git doesn't
track empty dirs, so no extra step is needed once both files are removed).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci-kmp-mobile.yml
git commit -m "ci: move kmp-mobile CI to root workflows, path-filtered"
```

---

### Task 9: Add `deploy-admin-ui.yml` and `deploy-backend.yml`, gated behind `DEPLOYS_ENABLED`

**Files:**
- Create: `.github/workflows/deploy-admin-ui.yml`
- Create: `.github/workflows/deploy-backend.yml`

**Interfaces:**
- Consumes: `.github/actions/coolify-deploy` (Task 5) with input `app-name` and
  `ssh-private-key`; reads secret `VPS_SSH_KEY` and repository variable `DEPLOYS_ENABLED`
  (both must be created by the user in `paz-tech-cwb/monorepo` settings — not part of this
  task; workflow runs will simply skip/no-op or fail if they're unset, which is the intended
  gated-off default per Global Constraints).
- Produces: two workflows that deploy on push to `main`, scoped by `paths`.

- [ ] **Step 1: Create the admin-ui deploy workflow**

Create `.github/workflows/deploy-admin-ui.yml`:

```yaml
name: Deploy Admin UI

on:
  push:
    branches: [main]
    paths:
      - 'admin-ui/**'

permissions:
  contents: read

jobs:
  deploy:
    if: vars.DEPLOYS_ENABLED == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Coolify
        uses: ./.github/actions/coolify-deploy
        with:
          app-name: paz-curitiba-admin-ui
          ssh-private-key: ${{ secrets.VPS_SSH_KEY }}
```

- [ ] **Step 2: Create the backend deploy workflow**

Create `.github/workflows/deploy-backend.yml`:

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'

permissions:
  contents: read

jobs:
  deploy:
    if: vars.DEPLOYS_ENABLED == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Coolify
        uses: ./.github/actions/coolify-deploy
        with:
          app-name: paz-curitiba-api
          ssh-private-key: ${{ secrets.VPS_SSH_KEY }}
```

- [ ] **Step 3: Validate YAML syntax for both files**

Run:
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-admin-ui.yml'))"
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-backend.yml'))"
```
Expected: no output for either command.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy-admin-ui.yml .github/workflows/deploy-backend.yml
git commit -m "ci: add gated path-filtered Coolify deploy workflows for admin-ui and backend"
```

---

### Task 10: Update `.ai/` docs to drop mobile-app/postman-files and reflect single-repo layout

**Files:**
- Modify: `.ai/architecture.md`
- Modify: `.ai/project.md`

**Interfaces:** None (documentation only).

- [ ] **Step 1: Update `.ai/architecture.md`**

In the system diagram (currently lines 5-15), remove the `mobile-app/ Flutter client` line.
The diagram block should read:

```txt
Firebase Auth
  │ OAuth / ID token
  ▼
backend/ NestJS REST API (/api)
  │ JWT access + refresh tokens
  ├── PostgreSQL via TypeORM
  ├── admin-ui/ Next.js staff dashboard
  └── kmp-mobile/ Kotlin Multiplatform client
```

In "Application boundaries" (currently lines 17-22), remove the line
`- **postman-files** mirrors API behavior for manual testing/documentation.` and change
`- **mobile clients** own member UX and use backend APIs plus platform push/deep-link integrations.`
to
`- **kmp-mobile** owns member UX and uses backend APIs plus platform push/deep-link integrations.`

- [ ] **Step 2: Update `.ai/project.md`**

Run: `grep -n "postman-files\|mobile-app" .ai/project.md`

Remove any table row or line referencing `postman-files/` (e.g. the
`| \`postman-files/\` | API collections and environments |` row) and any row referencing
`mobile-app/`. Keep the rest of the file unchanged.

- [ ] **Step 3: Verify no stale references remain**

Run: `grep -rn "mobile-app\|postman-files" .ai/`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add .ai/architecture.md .ai/project.md
git commit -m "docs: update architecture docs for single-repo, kmp-only mobile layout"
```

---

### Task 11: Update `agent-ops` autopilot config for the consolidated repo

**Files:**
- Modify: `/Users/jonathalima/Developer/agent-ops/automations/trello-autopilot/trello_autopilot_config.json`

**Interfaces:** None (external repo config, not part of `church`'s own git history — this task
edits a file in a sibling repo path).

- [ ] **Step 1: Read the current `church` project block**

Run:
```bash
grep -n -A25 '"key": "church"' /Users/jonathalima/Developer/agent-ops/automations/trello-autopilot/trello_autopilot_config.json
```

Confirm the current `repos` array has three entries (admin-ui, backend, kmp-mobile) each with
their own `path`/`production_branch`/`integration_branch`, as shown in the design spec's
Context section.

- [ ] **Step 2: Replace the per-submodule `repos` array with a single-repo entry**

Change the `church` project block's `repos` array from three entries to one:

```json
"repos": [
  {
    "name": "monorepo",
    "path": "/Users/jonathalima/Developer/church",
    "production_branch": "main",
    "integration_branch": "develop"
  }
]
```

Leave `deployment.enabled` as `false` — flipping it on is a separate, deliberate action outside
this plan's scope (per Global Constraints / spec Risks section).

- [ ] **Step 3: Validate JSON syntax**

Run:
```bash
python3 -c "import json; json.load(open('/Users/jonathalima/Developer/agent-ops/automations/trello-autopilot/trello_autopilot_config.json'))"
```
Expected: no output (valid JSON).

- [ ] **Step 4: Commit in the agent-ops repo**

```bash
cd /Users/jonathalima/Developer/agent-ops
git add automations/trello-autopilot/trello_autopilot_config.json
git commit -m "chore: point church autopilot config at consolidated monorepo layout"
```

---

## Post-Plan Manual Steps (not agent tasks — user-owned)

These are called out explicitly so nothing tries to automate them:

1. Generate an SSH keypair authorized on `root@62.238.45.195`, store the private key as repo
   secret `VPS_SSH_KEY` on `paz-tech-cwb/monorepo` (`gh secret set VPS_SSH_KEY -R
   paz-tech-cwb/monorepo < path/to/key`).
2. When ready to actually enable auto-deploy, set the repo variable `DEPLOYS_ENABLED=true` on
   `paz-tech-cwb/monorepo` (`gh variable set DEPLOYS_ENABLED --body true -R
   paz-tech-cwb/monorepo`). Until this is set, `deploy-admin-ui.yml`/`deploy-backend.yml` will
   report the job skipped (the `if:` condition is false), which is expected and not a failure.
3. Push the consolidated `develop` branch and open/merge whatever PRs your review process
   requires before merging to `main`.
