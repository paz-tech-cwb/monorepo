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
`1795900000006`/`1795900000007`/`1795900000008` are pending: running them and deploying are
human gates. `dispatch-claim.ts` holds the claim-first ReminderDispatchLog
helpers shared by the evaluator and notifications service; notifications use
conditional per-assignment claims (see `features/notifications.md`). New columns:
`declined_user_ids` (assignments) and `grandfathered` (member_settings). Details
in `features/life-groups.md`.

## Life group reports

`src/life-group-reports/`: list takes optional `?life_group_id=` (DTO field
needs `@Expose()` because of the global `excludeExtraneousValues` pipe), scopes
by form scope plus leader/co-leader groups, `GET :id` and `:id/audit` are
scope-aware (404 out of scope; `:id/audit` mapped to `AuditLogEntry`, no actor PII), responses are snake_case via `toResponse` with
`@SerializeOptions(exposeAll)`. Details in `features/life-groups.md`. Specs:
`life-group-reports.service.spec.ts`, `life-group-reports.controller.spec.ts`
(real global pipe + `ClassSerializerInterceptor`).

## Validation

Prefer focused tests first:

```bash
cd backend
npx jest src/<feature>/<file>.spec.ts
npm run test
npm run lint
```

## Scope and life group visibility

`ScopeResolverService.resolve` unions every Area/Sector/LifeGroup the user leads
or co-leads (row-based, not role-slug-based); admin/pastor stay unrestricted.
`LifeGroupsService.findMine` (`GET /life-groups/me`) includes supervised groups
and adds `relationship` + `is_supervised` (roster omitted for supervisor-only rows). `ScopeResolverService` is row-based, one ids-only SQL; casa-de-paz write bypass still needs the area/sector leader slug. See `features/life-groups.md`
(Visibility).
