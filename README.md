# Paz Church Curitiba — Platform

A single monorepo for the Paz Church Curitiba digital platform.

## Apps

| Path | Stack | Purpose |
|---|---|---|
| `backend/` | NestJS, TypeORM, PostgreSQL | REST API consumed by all clients |
| `admin-ui/` | Next.js, React, TypeScript | Staff/admin dashboard |
| `kmp-mobile/` | Kotlin Multiplatform | Cross-platform mobile workstream |

## AI/project documentation

Canonical agent-facing documentation lives in `.ai/`.

Start here:

```txt
.ai/README.md
.ai/project.md
.ai/architecture.md
.ai/feature-map.md
```

Feature docs live in `.ai/features/`; app docs live in `.ai/apps/`.

## Getting started

```bash
git clone <root-repo-url>
cd church
npm install
cp .env.example .env
npm run setup
npm run dev
```

Services:

| Service | Default target |
|---|---|
| admin-ui | `http://localhost:3000` |
| backend API | `http://localhost:3001/api` |
| kmp-mobile | Android/iOS via Gradle/Xcode |

## Common commands

```bash
npm run db          # Start PostgreSQL
npm run dev         # Start local backend/admin stack
npm run dev:backend # Backend only
npm run dev:admin   # Admin UI only
npm run setup       # Start DB and run migrations
```

## Branching

This is a single repository — `backend/`, `admin-ui/`, and `kmp-mobile/` are ordinary tracked directories, not submodules. Work on `develop`, then merge to `main`. There are no submodule pointers to update; app changes and root-level documentation changes are committed together in the same repository history.

## Architecture summary

Authentication is shared across clients:

1. Firebase Auth issues an ID token.
2. Client exchanges it with backend `/api/auth/social-login`.
3. Backend returns JWT access and refresh tokens.
4. Clients use JWTs for API requests and refresh through `/api/auth/refresh`.

For the full architecture, read `.ai/architecture.md`.
