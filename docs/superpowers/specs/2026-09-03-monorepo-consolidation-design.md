# Monorepo Consolidation + CI/CD Design

## Context

`church` (GitHub remote: `paz-tech-cwb/monorepo`) currently pulls in `admin-ui`, `backend`,
`kmp-mobile`, `mobile-app`, and `postman-files` as git submodules, each its own repo with its
own branch scheme (admin-ui/kmp-mobile use `main`, backend uses `master` plus
`release/church-*` tags, postman-files uses `main`). `mobile-app` (Flutter) is dead code —
kmp-mobile is the only mobile client going forward. `postman-files` is no longer needed.

There is currently no live GitHub Actions CI/CD for admin-ui or backend (no `.github/workflows`
in either repo). The intended deploy design already exists, but disabled, in
`agent-ops/automations/trello-autopilot/trello_autopilot_config.json`:

```json
"deployment": {
  "enabled": false,
  "type": "coolify_guarded",
  "host": "root@62.238.45.195",
  "command": "coolify-guarded-deploy",
  "apps": { "church": ["paz-curitiba-api", "paz-curitiba-admin-ui"] },
  "mode": "github_actions_on_production_branch"
}
```

`kmp-mobile` does have CI today (`android-ci.yml`, `ios-ci.yml`), build/test only, no deploy.

Goal: collapse everything into one monorepo, drop the Flutter app and Postman collection, and
build the (currently missing) CI/CD so pushing to `main` deploys admin-ui and/or backend to
Coolify — but only the app(s) whose files actually changed.

## Scope

In scope:
- Convert `admin-ui`, `backend`, `kmp-mobile` from submodules to real monorepo folders,
  preserving each one's git history.
- Remove `mobile-app` and `postman-files` submodule references from `church`; archive their
  standalone GitHub repos (`paz-tech-cwb/mobile-app`, `paz-tech-cwb/postman-files`).
- Unify branching on the monorepo's own `develop` → `main`; retire backend's `master` +
  `release/church-*` tagging and admin-ui/kmp-mobile's separate `main` branches.
- Add path-filtered GitHub Actions workflows at the monorepo root for PR CI and production
  deploys for admin-ui and backend, plus a moved-in, path-filtered CI for kmp-mobile.
- Update `.ai/` docs and `agent-ops` autopilot config to reflect the new single-repo structure.

Out of scope:
- Actually creating/rotating the VPS SSH deploy key (manual, user-owned — see Risks).
- Changing Coolify app configuration itself (build packs, env vars, domains).
- kmp-mobile app-store release automation (build/test CI only, no deploy in this pass).

## Repo consolidation

For each of `admin-ui`, `backend`, `kmp-mobile`:

1. `git submodule deinit <path>`, remove the entry from `.gitmodules`, `git rm --cached <path>`.
2. Re-import via `git subtree add --prefix=<path> <repo-url> <default-branch> --squash=false`
   (no `--squash`, so full history is imported) so `git log -- <path>/` still resolves to the
   original commits.
3. Commit the result on the monorepo's `develop` branch.

For `mobile-app` and `postman-files`:

1. `git submodule deinit` + remove `.gitmodules` entry + `git rm --cached` — no history import,
   since they're being dropped, not merged.
2. Archive (not delete) `paz-tech-cwb/mobile-app` and `paz-tech-cwb/postman-files` on GitHub
   (`gh repo archive`), so they remain readable but read-only and clearly retired.

End state: `church`/`monorepo` has zero submodules; `admin-ui/`, `backend/`, `kmp-mobile/` are
ordinary folders with full history.

## Branching model

- `develop` is the integration branch for all work across admin-ui, backend, and kmp-mobile.
- `main` is the single production branch. Merging `develop` → `main` is what triggers
  production deploys (see below).
- Backend's separate `master` branch and `release/church-*` tags are retired; no new commits
  or tags go there once the subtree import lands. Historical tags stay as read-only markers in
  the imported history.
- admin-ui's and kmp-mobile's separate `main` branches (in their now-archived-or-inactive
  original repos) are likewise no longer the branch of record.

## CI/CD workflows

All new workflow files live at the monorepo root: `.github/workflows/`.

**PR CI (build/lint/test on every PR touching the path):**
- `ci-admin-ui.yml` — trigger: `pull_request` with `paths: ['admin-ui/**']`
- `ci-backend.yml` — trigger: `pull_request` with `paths: ['backend/**']`
- `ci-kmp-mobile.yml` — moved/adapted from kmp-mobile's existing `android-ci.yml` +
  `ios-ci.yml`, trigger: `pull_request` with `paths: ['kmp-mobile/**']`

**Production deploy (push to `main` only, path-filtered):**
- `deploy-admin-ui.yml` — trigger: `push` to `main`, `paths: ['admin-ui/**']`. Runs
  `coolify-guarded-deploy paz-curitiba-admin-ui` over SSH to `root@62.238.45.195`.
- `deploy-backend.yml` — trigger: `push` to `main`, `paths: ['backend/**']`. Runs
  `coolify-guarded-deploy paz-curitiba-api` over SSH to the same host.
- Both deploy workflows share a composite action (e.g.
  `.github/actions/coolify-deploy/action.yml`) that wraps the SSH connection + guarded-deploy
  call, parameterized by app name, to avoid duplicating the SSH/guard logic.
- Path filters on `push` mean a `main` merge touching only `admin-ui/` never fires the backend
  deploy, and vice versa — this satisfies "only deploy what changed."
- Both deploy workflows are gated behind a workflow-level `if:` check (e.g. a repo variable
  `DEPLOYS_ENABLED`) defaulting to off, mirroring `deployment.enabled: false` in the autopilot
  config today, so merging this work does not itself start auto-deploying. Flipping the gate on
  is a deliberate, separate action.

kmp-mobile's CI keeps building/testing Android and iOS targets on relevant PRs; no deploy step
is added for it in this pass.

## Secrets / manual prerequisites

The deploy workflows need SSH access to `root@62.238.45.195`. No such secret currently exists
on `paz-tech-cwb/monorepo`, `admin-ui`, or `backend` (only `SUBMODULES_PAT` exists on
`monorepo`). Before `deploy-admin-ui.yml`/`deploy-backend.yml` can run successfully:

- **User action required:** generate an SSH keypair authorized on the VPS, and store the
  private key as a `paz-tech-cwb/monorepo` repository secret (e.g. `VPS_SSH_KEY`). This is a
  credential-creation step and is intentionally left to the user, not automated by an agent.

## Documentation updates

- `.ai/architecture.md`, `.ai/project.md`: remove references to `mobile-app` and
  `postman-files`; update the system diagram/app boundaries to reflect the single-repo layout.
- `agent-ops/automations/trello-autopilot/trello_autopilot_config.json`: update the `church`
  project's `repos` entries — drop separate `production_branch`/`path` per submodule, since
  admin-ui/backend/kmp-mobile now all live under one `path` (`/Users/jonathalima/Developer/church`)
  with one `production_branch: main` / `integration_branch: develop`. Flip `deployment.enabled`
  only when the user is ready to turn deploys on.

## Risks / open considerations

- `git subtree` history import can be slow and produces a large single commit graph merge;
  should be done as its own isolated step, verified (`git log --follow` spot-checks) before
  deleting the old submodule remotes' relevance.
- Until the SSH secret exists, deploy workflows will fail closed (or stay gated off) — this is
  intentional, not a bug to fix later.
- Archiving `mobile-app`/`postman-files` on GitHub is reversible (unarchive) but is still an
  external-visibility change; confirm final go-ahead before running `gh repo archive`.
- Coolify app names (`paz-curitiba-admin-ui`, `paz-curitiba-api`) are assumed correct from the
  existing autopilot config and have not been independently verified against the live Coolify
  instance in this pass.
