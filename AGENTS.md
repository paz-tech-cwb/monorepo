# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Repository Structure

This is the **Paz Church Curitiba** platform — a git submodules monorepo. Each subfolder is an independent git repository:

| Submodule | Stack | Purpose |
|-----------|-------|---------|
| `admin-ui/` | Next.js 15, React 19, TypeScript | Admin dashboard for church staff |
| `backend/` | NestJS 11, TypeORM, PostgreSQL 16 | REST API (global prefix `/api`) |
| `mobile-app/` | Flutter 3.7+, Dart, GetX | Member-facing mobile app |
| `postman-files/` | Postman collections | API testing and documentation |

Each submodule has its own `AGENTS.md` with detailed conventions — read it when working inside that submodule.

## Submodule Workflow

```bash
# Clone everything fresh
git clone --recurse-submodules <root-repo-url>

# Update all submodules to their latest remote commits
git submodule update --remote

# Commits inside a submodule must be made from within that folder
cd backend && git add . && git commit -m "..." && git push
# Then come back and record the new pointer in the root repo
cd .. && git add backend && git commit -m "chore: update backend submodule"
```

## Common Commands

### admin-ui
```bash
cd admin-ui
npm run dev        # Dev server at http://localhost:3000
npm run build      # Production build
npm run lint       # ESLint
```

### backend
```bash
cd backend
docker compose up -d   # Start local PostgreSQL
npm run start:dev       # Dev server at http://localhost:3001
npm run test            # All unit tests
npx jest src/<feature>/<file>.spec.ts  # Single test file
npm run lint            # ESLint with auto-fix
npm run migration:run   # Apply DB migrations
```

### mobile-app
```bash
cd mobile-app
flutter pub get    # Install dependencies
flutter run        # Run on connected device/emulator
flutter analyze    # Lint
flutter test       # Unit tests
```

## System Architecture

All three apps share the same auth flow:
1. User authenticates via **Firebase Auth** (Google or Apple OAuth)
2. Firebase ID token is exchanged with the **backend** (`POST /api/auth/social-login`) for a JWT access token (24h) + refresh token (30d)
3. The admin-ui and mobile-app store tokens locally; the backend stores a SHA-256 hash of the refresh token
4. On 401, clients auto-refresh via `POST /api/auth/refresh`

```
Firebase Auth ──► backend /api/auth ──► JWT access + refresh tokens
                         │
              ┌──────────┼──────────┐
          admin-ui   mobile-app  postman-files
```

**Backend → admin-ui API contract:** JSON is always `snake_case` on the wire. The admin-ui has no transformation layer — `snake_case` keys flow directly from API types into components.

**Backend roles:** `admin`, `pastor`, `area_leader`, `sector_leader`, `life_group_leader`, `member`
**Admin-ui roles:** `admin`, `pastor`, `supervisor`, `lg-leader`, `member`

## Environment Setup

### backend `.env`
```bash
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=...
DB_PASSWORD=...
DB_NAME=...
DB_SYNCHRONIZE=false
DB_LOGGING=false
ACCESS_TOKEN_SECRET=  # 32+ chars
REFRESH_TOKEN_SECRET= # 32+ chars
GOOGLE_CLIENT_ID=
CORS_ORIGIN=http://localhost:3000
```

### admin-ui `.env.local`
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```
