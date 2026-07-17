# Spec: Fix backend address insert schema drift

## Request

Fix production backend error on `POST /api/users`:

```text
QueryFailedError: column "number" of relation "addresses" does not exist
```

## Context files read

- `.ai/README.md`
- `.ai/project.md`
- `.ai/architecture.md`
- `.ai/conventions.md`
- `.ai/commands.md`
- `.ai/feature-map.md`
- `.ai/features/people-and-membership.md`
- `.ai/features/deployment.md`
- `.ai/apps/backend.md`
- `.ai/pipelines/handoff-template.md`
- `backend/CLAUDE.md`
- `backend/src/addresses/entities/address.entity.ts`
- `backend/database/migrations/1694000000000-InitialSchema.ts`
- `backend/database/migrations/1784073600000-AddUserAddressDetails.ts`
- `backend/src/users/users.service.ts`
- `backend/src/users/dto/create-user.dto.ts`
- `backend/src/addresses/dto/create-address.dto.ts`
- `backend/package.json`
- `backend/Dockerfile`
- root `docker-compose.yaml`

## Affected apps/features

- `backend/` deployment startup
- People & membership user creation with addresses
- Deployment/runtime documentation

## Root cause

The backend entity and user creation flow already write `addresses.number`, `addresses.complement`, and `addresses.neighborhood`. The migration `1784073600000-AddUserAddressDetails` already exists to add those columns. The production container starts the compiled API directly and does not run pending migrations, so deployed databases can miss those columns while the app code expects them.

## Implementation plan

1. Keep the existing address entity and migration unchanged.
2. Add production-safe package scripts that can run compiled TypeORM migrations without rebuilding at container startup.
3. Change the backend Docker command to run pending migrations before starting the API process.
4. Document the deployment behavior in `.ai/features/deployment.md`.
5. Validate with backend build and migration command wiring.

## API/data/auth impacts

- No API contract changes.
- No auth behavior changes.
- No new migration is needed because `1784073600000-AddUserAddressDetails` already adds the missing address columns.
- Deployment behavior changes: backend container applies pending migrations before serving traffic.

## Validation plan

- `cd backend && npm run build`
- `cd backend && npm run migration:run:prod` to verify command wiring; local DB may be unavailable, in which case record the connection failure.

## OPEN QUESTIONS

None.
