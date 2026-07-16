# App: Root Monorepo

## Purpose

Coordinates submodules, local orchestration, documentation, and deployment-level configuration.

## Important files

| File | Purpose |
|---|---|
| `.gitmodules` | Submodule paths/remotes |
| `package.json` | Root local dev scripts |
| `docker-compose.yaml` | Containerized deployment entrypoint |
| `.env.example` | Root environment template |
| `.ai/` | Canonical AI project context |

## Rules

- Root commits should not accidentally include unrelated submodule pointer changes.
- Submodule code changes must be made and committed inside the submodule when requested.
- Root docs can describe cross-app architecture, but app implementation details should stay close to the app when highly specific.
