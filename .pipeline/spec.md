# Spec: Phase 0 - stabilize the weekly life-group report (backend + admin-ui)

Source: `.pipeline/design-attendance-report-merge.md` section 6 "Phase 0", `.pipeline/pilot-audit.md` flow 6. Branch `fix/life-group-report-submit` (from origin/develop 6d87aef). This spec covers scope items 1 (backend) and 2 (admin-ui). Mobile submit fix and the form_report reminder skip are a later agent on this branch.

## Verified findings (code)
1. `POST /forms/life-group-reports` has `@Roles('admin','pastor','area_leader','sector_leader','life_group_leader')`: a co-leader (role `member`) or a `member`-role leader gets 403.
2. `create()` never checks the actor may report for `dto.life_group_id`, and trusts client `area_id`/`sector_id` (any leader can post for any group, with mismatching area/sector).
3. DTO has no `@Min`, no array/string caps, `offering` only `IsNumberString` (column is `numeric(10,2)`: an 11+ digit value would 500), no future-date check.
4. `PATCH :id` (`UpdateLifeGroupReportDto = PartialType(Create)`) does `Object.assign(m, dto)`: a submitter within 24h could move the report to another group/area/sector by sending `life_group_id`, bypassing any create-time check.
5. `forms-catalog.service.ts` shows `life-group-reports` only for role slugs admin/pastor/area_leader/sector_leader/life_group_leader: a `member`-role leader or co-leader never sees the entry. Catalog is the only thing the mobile Formularios list uses to show entries (`can_write`/`can_read`), so mobile hides the form for them.
6. admin-ui form sends `pastoring_activity_type`/`training_activity_type` as plain strings (DTO wants `string[]`), omits `leader_attended` and both `*_other`; `lib/api/types/formularios.ts` types the two as `string`.
7. Attendance's future-date check uses UTC (`new Date().toISOString().slice(0,10)`); the church timezone is America/Sao_Paulo (`CHURCH_TIME_ZONE`, `zonedParts` in `life-group-attendance/meeting-day.util.ts`).

## Decisions
- D1 Create authorization is scope-based, enforced by a NEW injectable `LifeGroupReportCreatePolicy` (`life-group-reports/life-group-report-create-policy.ts`) called by the controller before `service.create`. `LifeGroupReportsService` is NOT edited (zero textual overlap with PR #96, which rewrites `create`, imports and `toResponse` in that file). `service.create(dto, actorId)` stays a raw persist and is only reachable through the controller.
- D2 Policy order: (a) date not in the future (400, Sao Paulo calendar day; stricter and more correct than attendance's UTC key, never rejects a legitimate same-day submission since SP today <= UTC today); (b) load group with leader/coLeader/sector/area (404 if missing); (c) allow if scope unrestricted OR `group.id` in `scope.lifeGroupIds` OR actor is `leader.id`/`coLeader.id` else 403; (d) 422 if group has no sector or its sector has no area; (e) derive `areaId`/`sectorId` from the group and return a copy of the dto with them overwritten.
- D3 `area_id`/`sector_id` stay in the DTO as `@IsOptional @IsInt` and are IGNORED (overwritten by derivation). Old clients/admin-ui that send them keep working; mismatching values are not an error.
- D4 Validation (shared by create and, via PartialType, update): counts `@IsInt @Min(0) @Max(100000)`; `offering` keeps `@IsNumberString` and adds `@Matches(/^\d{1,8}(\.\d{1,2})?$/)`; arrays `@IsArray @ArrayMaxSize(20) @IsString({each}) @MaxLength(80,{each})`; `*_other` `@MaxLength(180)` (column is varchar(180)). Request/response shapes unchanged.
- D5 Update path: only to keep the new create rule from being bypassed, `life_group_id`, `area_id`, `sector_id` are NOT accepted by PATCH (the update DTO omits them; extraneous keys are dropped by the global pipe, so no client gets a 400). The policy check (`FormSubmissionPolicyService`) is not widened. Documented as a narrowing.
- D6 Catalog: `life-group-reports` entry becomes visible (`can_write` and `can_read`) for any actor who is leader/co-leader of at least one life group, in addition to the static role list. `FormsCatalogService` gets a cheap `EntityManager` existence query (only run for actors NOT already allowed by role and only for entries flagged `ledGroupAccess`). Read side already allows leaders/co-leaders (#92), so can_read=true is consistent. Mobile shows catalog entries as returned: no mobile change needed for visibility.
- D7 Not done here (later agent / out of scope): mobile submit payload, `form_report` reminder smart skip, duplicate-per-(group,date) guard (PR #96 adds the partial unique index and 409 mapping), meetings endpoint.

## PR #96 overlap (origin/feat/life-group-meetings-api, draft)
#96 changes `life-group-reports.service.ts` (imports, response type moved to mapper, `create` try/catch 23505 -> 409), `entities/life-group-report.entity.ts` (attendance_id), adds `life-group-report-snapshot.service.ts`, `life-group-report.mapper.ts`, `life-group-attendance/life-group-access.util.ts`, edits `form-submission-audit.service.ts`, and `.ai/*`, `.pipeline/*`.
This branch: does NOT touch `life-group-reports.service.ts`, the entity, `form-submission-audit.service.ts` or any file #96 adds. It edits: `life-group-reports.controller.ts`, `life-group-reports.module.ts` (add provider), `dto/create-life-group-report.dto.ts`, `dto/update-life-group-report.dto.ts`, new policy files, `forms-catalog.*`, specs `life-group-reports.controller.spec.ts`. Expected conflicts: only the shared `.ai/features/life-groups.md`, `.ai/apps/backend.md` and `.pipeline/*.md` (documentation; resolve by keeping both). The policy does not use #96's `assertCanAccessLifeGroup`; after both merge it can be swapped for it.

## Scope
New: `backend/src/life-group-reports/life-group-report-create-policy.ts` (+ `.spec.ts`).
Modified backend: controller, module, create/update DTOs, controller spec, `forms-catalog.service.ts` (+ spec), `forms-catalog.module.ts` if the EntityManager needs wiring (TypeORM root provides it).
Modified admin-ui: `lib/api/types/formularios.ts`, `app/(dashboard)/formularios/life-group-reports/new/life-group-reports-form.tsx`, list/detail rendering of arrays (`_columns.tsx`/detail if arrays are rendered).
Docs: `.ai/features/life-groups.md`, `forms.md`, `apps/backend.md`, `apps/admin-ui.md`; `.pipeline/changes.md`, `test-results.md`.

## Tests
Policy spec + controller spec (real global pipe + serializer): leader, co-leader with role member, member-role leader, leader of two groups, area/sector supervisor in/out of scope, plain member 403, other group's leader 403, admin/pastor, group without sector/area 422, client-sent area/sector ignored, validation limits (counts, offering, arrays, other, future date), derived fields, unchanged old behaviors (GETs). Catalog: leader-of-group member sees entry, plain member does not, role-based unchanged, admin does not query DB. Update DTO drops life_group_id.

## Validation
Backend: `npm run build`; scoped jest (life-group-reports, forms-catalog, forms-core, life-group-attendance); full jest vs develop baseline; scoped eslint (no --fix) and prettier --check. Admin-ui: `pnpm install --frozen-lockfile`, `npx tsc --noEmit` (baseline 28 errors), scoped eslint, `next build`.
