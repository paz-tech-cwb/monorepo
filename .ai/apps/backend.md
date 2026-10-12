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

## Life group tasks

`src/life-group-tasks/` (module registered in `app.module.ts`): pure
`eligibility.ts` and `assignment-engine.ts`, services for templates/config/
assignments/roster/notifications, controllers for admin templates,
`life-groups/:id/*` and `/me/life-group-tasks`. Reminder evaluator:
`reminders/evaluators/life-group-tasks.evaluator.ts`. Migrations
`1795900000003`/`1795900000004` are pending: running them and deploying are
human gates. Details in `features/life-groups.md`.

## Validation

Prefer focused tests first:

```bash
cd backend
npx jest src/<feature>/<file>.spec.ts
npm run test
npm run lint
```
