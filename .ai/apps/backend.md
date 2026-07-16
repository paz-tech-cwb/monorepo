# App: Backend

## Stack

NestJS 11, TypeORM, PostgreSQL 16, REST API with global prefix `/api`.

## Responsibilities

- Business rules and authorization.
- Persistence and migrations.
- Auth token exchange/refresh.
- Role/cascade-scoped data access.
- Notification dispatch and API contracts for clients.

## Agent entry points

Before editing backend, inspect:

- backend module for the feature being changed;
- DTOs/entities/migrations related to the data model;
- guards/roles/permissions for access behavior;
- existing unit tests for the feature.

## Validation

Prefer focused tests first:

```bash
cd backend
npx jest src/<feature>/<file>.spec.ts
npm run test
npm run lint
```
