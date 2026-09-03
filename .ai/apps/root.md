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

## Rules

- Commits should stay scoped to the app folder(s) they actually change; avoid bundling unrelated changes across backend/admin-ui/kmp-mobile in one commit unless the change is genuinely cross-cutting.
- Root docs can describe cross-app architecture, but app implementation details should stay close to the app when highly specific.
