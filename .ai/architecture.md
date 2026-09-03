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
