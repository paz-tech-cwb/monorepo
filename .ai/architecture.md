# Architecture

## System overview

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

## Repository and deployment topology

- Single monorepo (`paz-tech-cwb/monorepo`, checked out locally as `church`) — `backend/`, `admin-ui/`, and `kmp-mobile/` are ordinary tracked folders, not git submodules.
- Branch model: `develop` is the integration branch; `main` is the single production branch for the whole repo. There is no separate per-app production branch (backend's old `master` and the apps' separate `main` branches, from before consolidation, are retired).
- CI/CD is path-filtered per app folder in root `.github/workflows/`: a PR touching only `admin-ui/**` never runs backend's or kmp-mobile's checks, and vice versa. Merges to `main` can trigger a Coolify deploy for `admin-ui` or `backend` specifically, scoped the same way — gated off by default via the `DEPLOYS_ENABLED` repo variable. See `features/deployment.md` for the full CI/CD contract.
- `kmp-mobile` has CI (build/test) but no deploy workflow — mobile release remains a separate, manual process.

## Application boundaries

- **backend** owns business rules, persistence, authorization, migrations, and API contracts.
- **admin-ui** owns staff workflows and uses the backend API directly.
- **kmp-mobile** owns member UX and uses backend APIs plus platform push/deep-link integrations.

## Authentication contract

1. User authenticates with Firebase Auth using Google or Apple OAuth.
2. Client sends Firebase ID token to `POST /api/auth/social-login`.
3. Backend returns JWT access token and refresh token.
4. Clients attach the JWT to authenticated API requests.
5. On `401`, clients refresh through `POST /api/auth/refresh`.
6. Backend stores only a SHA-256 hash of refresh tokens.

## API contract

- Backend global prefix is `/api`.
- Backend-to-admin JSON is `snake_case` on the wire.
- Do not add a hidden transformation layer in admin-ui unless the architecture is deliberately changed.
- Prefer explicit DTO/API types over untyped objects.

## Authorization model

Canonical backend roles:

- `admin`
- `pastor`
- `area_leader`
- `sector_leader`
- `life_group_leader`
- `member`

Admin UI display/application roles may differ and must map intentionally to backend roles.

## Data visibility pattern

Leadership data visibility follows cascade scope:

- `admin`/`pastor`: global visibility.
- `area_leader`: area and all sectors/life groups inside it.
- `sector_leader`: sector and all life groups inside it.
- `life_group_leader`: own life group.
- `member`: own profile/submissions unless explicitly granted otherwise.

## Persistence pattern

- PostgreSQL is the primary database.
- TypeORM migrations should describe schema changes.
- Avoid relying on `synchronize` for real environments.
- For bounded, report-heavy domains, typed tables are preferred over broad JSON blobs unless the feature explicitly requires schema flexibility.

## Cross-cutting concerns

- Push notifications must include enough data for mobile navigation when the target is entity-specific.
- User-facing changes that affect backend/admin/mobile should be documented feature-by-feature.
- New features should update the feature map and their feature file.
