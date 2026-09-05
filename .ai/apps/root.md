# App: Root Monorepo

## Purpose

Coordinates local orchestration, documentation, and deployment-level configuration for the monorepo.

## Important files

| File | Purpose |
|---|---|
| `package.json` | Root local dev scripts |
| `docker-compose.yaml` | Containerized deployment entrypoint |
| `.env.example` | Root environment template |
| `.ai/` | Canonical AI project context |
| `.github/workflows/` | Path-filtered PR CI and gated Coolify deploy workflows (see `features/deployment.md`) |
| `.github/actions/coolify-deploy/` | Shared composite action used by the deploy workflows |

## Rules

- Commits should stay scoped to the app folder(s) they actually change; avoid bundling unrelated changes across backend/admin-ui/kmp-mobile in one commit unless the change is genuinely cross-cutting.
- Root docs can describe cross-app architecture, but app implementation details should stay close to the app when highly specific.
- When adding a new app folder that needs CI or deploys, follow the existing path-filtered workflow pattern in `.github/workflows/` rather than inventing a new one; see `features/deployment.md` for the CI/CD section.
