# Paz Church Curitiba — Platform

A git-submodule monorepo for the Paz Church Curitiba digital platform.

## Apps

| Path | Stack | Purpose |
|---|---|---|
| `backend/` | NestJS, TypeORM, PostgreSQL | REST API consumed by all clients |
| `admin-ui/` | Next.js, React, TypeScript | Staff/admin dashboard |
| `mobile-app/` | Flutter, Dart | Member-facing mobile app |
| `kmp-mobile/` | Kotlin Multiplatform | Cross-platform mobile workstream |
| `postman-files/` | Postman | API collections and environments |

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
git clone --recurse-submodules <root-repo-url>
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
| mobile app | connected device / emulator |

## Common commands

```bash
npm run db          # Start PostgreSQL
npm run dev         # Start local backend/admin stack
npm run dev:backend # Backend only
npm run dev:admin   # Admin UI only
npm run dev:mobile  # Flutter mobile only
npm run setup       # Start DB and run migrations
```

## Submodule workflow

Each app folder is an independent git repository. Commit app changes inside the relevant submodule, then update the root submodule pointer if needed.

```bash
cd backend
git checkout -b feat/example
# make changes
git commit -am "feat: example"
git push

cd ..
git add backend
git commit -m "chore: update backend submodule"
```

## Architecture summary

Authentication is shared across clients:

1. Firebase Auth issues an ID token.
2. Client exchanges it with backend `/api/auth/social-login`.
3. Backend returns JWT access and refresh tokens.
4. Clients use JWTs for API requests and refresh through `/api/auth/refresh`.

For the full architecture, read `.ai/architecture.md`.
