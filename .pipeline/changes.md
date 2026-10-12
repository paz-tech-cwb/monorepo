# Changes

## Changed files

- `backend/package.json` — added production scripts for running compiled TypeORM migrations and then starting the API.
- `backend/Dockerfile` — changed container command from direct Node startup to `npm run start:prod:migrate`.
- `.ai/features/deployment.md` — documented that production backend containers run pending migrations before serving.
- `.pipeline/*` — updated ship pipeline handoff for this fix.

## Behavior changes

- Backend production containers now run pending TypeORM migrations before starting `dist/src/main.js`.
- Pending migration `1784073600000-AddUserAddressDetails` will add `addresses.number`, `addresses.complement`, and `addresses.neighborhood` in environments where it has not run yet.
- `POST /api/users` can insert address details without failing on missing `addresses.number` once the updated container starts successfully.

## Docs updated

- `.ai/features/deployment.md`

## Migration/deployment notes

- No new migration was added; the existing migration already covers the missing columns.
- Deployment must rebuild/redeploy the backend image so the new Docker command runs.
- If multiple backend replicas are started simultaneously, TypeORM migration locking/metadata handles already-applied migrations; prefer rolling out with a single backend replica during migration if the hosting setup allows it.

## Follow-ups

- Consider adding an explicit deployment job/service for migrations if the platform grows beyond a single backend container pattern.

---

## Phase B1 — backend foundation (life group rotating tasks)

### Files
- `backend/database/migrations/1795900000003-AddLifeGroupTasksEnumValues.ts` — adds `life_group_tasks` to `reminder_rule_type_enum` and `life_group_task` to `notification_category_enum` (own migration: Postgres cannot use a new enum value in the same transaction).
- `backend/database/migrations/1795900000004-CreateLifeGroupTasks.ts` — idempotent (`IF NOT EXISTS`) creation of templates, overrides, assignments (snapshots, `notified_at`, `reminded_at`, unique group/template/date, status/source checks), member_settings, group_settings (`min_present_meetings` default 3), skips; `user_life_groups.joined_at timestamptz NOT NULL DEFAULT now()`; grandfather INSERT (`eligible=true`, note `grandfathered at migration`, `ON CONFLICT DO NOTHING`); seeds reminder rule `life_group_tasks` ENABLED (`days_before_meeting:[3,1]`, `hour:9`). `down()` reverses all.
- `backend/src/life-group-tasks/entities/*.entity.ts` (6 entities) + registered in `backend/src/configs/orm.config.ts`.
- `backend/src/life-group-tasks/eligibility.ts` — pure `resolveEligibility` (explicit wins; leader/co-leader eligible; else present count >= min).
- `backend/src/life-group-tasks/assignment-engine.ts` — pure `assignTasks` with injectable RNG, `createSeededRng`.
- `backend/src/life-group-tasks/{eligibility,assignment-engine}.spec.ts`.

### Notes
- `user_life_groups` join table needs no entity change: TypeORM many-to-many inserts only `user_id`/`life_group_id`, so `joined_at` takes its DB default `now()`. No other insert path writes that table via raw SQL (grep of `src` found only the User entity `@JoinTable`).
- Not done in B1 (belongs to B3): `ReminderRuleType`/`DEFAULT_CONFIGS` TS type, `ReminderRule` entity enum list, `NOTIFICATION_CATEGORIES`/channel map entries.
- Migration NOT run against any DB.

---

## Phase B2 — backend module, services, controllers (life group rotating tasks)

### Files (all under `backend/src/life-group-tasks/` unless noted)
- `life-group-tasks.module.ts` (registered in `backend/src/app.module.ts`), imports `FormsCoreModule` for `ScopeGuard`.
- Services: `life-group-task-templates.service.ts` (admin CRUD/reorder; delete refused with 409 when assignments exist), `life-group-task-config.service.ts` (overrides, per-member eligibility, group settings, skip dates), `life-group-task-assignments.service.ts` (generate/list/reroll/reassign/decline/member views), `life-group-task-roster.service.ts` (members UNION leader/co-leader, inactive dropped, eligibility via `eligibility.ts`, present counts from `life_group_attendance_entries`), `life-group-task-access.ts` (scope + `co_leader_id`/`leader_id` fallback, date validation).
- Controllers: `life-group-task-templates.controller.ts` (`@Roles('admin')` + `RolesGuard` only), `life-groups/:lifeGroupId/*` in `life-group-tasks.controller.ts` (`AuthGuard('jwt')` + `ScopeGuard`, `@SerializeOptions exposeAll`), `my-life-group-tasks.controller.ts` (`/me/life-group-tasks`).
- DTOs (`dto/*.ts`, snake_case wire via `@Expose({name})`, class-validator).
- Notification hook: abstract `LifeGroupTaskNotifier` (`life-group-task-notifier.ts`) + `NoopLifeGroupTaskNotifier`, provided by the module; B3 swaps in the real implementation.
- Specs: assignments, config, templates services; controller access-metadata spec.

### Endpoints (prefix `/api`)
- Admin: `GET/POST /life-group-task-templates`, `PATCH/DELETE /life-group-task-templates/:id`, `PUT /life-group-task-templates/reorder` (`template_ids`).
- Leader/co-leader/admin: `GET/PUT /life-groups/:id/task-overrides`, `GET/PUT /life-groups/:id/task-members`, `GET/PUT /life-groups/:id/task-settings`, `GET/POST /life-groups/:id/task-skips`, `DELETE /life-groups/:id/task-skips/:date`, `GET /life-groups/:id/tasks?date=`, `POST /life-groups/:id/tasks/generate` (`meeting_date`), `POST /life-groups/:id/tasks/reroll` (`assignment_id`), `PATCH /life-groups/:id/tasks/:assignmentId` (`user_id`).
- Member: `GET /me/life-group-tasks`, `GET /me/life-group-tasks/:id`, `POST /me/life-group-tasks/:id/decline`.

### Behavior notes / deviations
- `POST .../tasks/generate` requires `meeting_date` (the "next meeting date" helper arrives in B3); it validates the weekday against the group's fixed `meeting_day`. The evaluator (B3) calls `LifeGroupTaskAssignmentsService.generateForMeeting(groupId, date)`, which returns `{assignments, created, unassignableTemplateIds, skipped}`.
- Generation is idempotent: only templates without a row are assigned; insert uses `ON CONFLICT DO NOTHING` (`orIgnore`); history excludes the current date, skipped dates and declined rows.
- Reroll/decline update the same row (unique group/template/date): new `user_id`, `source='reroll'`, `status='assigned'`, `notified_at/reminded_at` reset, guarded on the previous assignee (409 on race). When nobody qualifies: reroll -> 409; decline -> row stays `declined` and `notifyUnassignable` is called. The decliner is not remembered beyond that (no extra table), so a later leader re-roll could pick them again.
- `PUT task-members` per entry: omitted `reason`/`excluded_template_ids` = unchanged; `reset_to_automatic: true` deletes the explicit row (the `eligible` column is NOT NULL so "automatic" == no row). Leader notes are only returned by `GET/PUT task-members`; member endpoints build responses from an explicit field list.
- Manual reassign accepts any active roster member (leader's explicit choice), including one the rule would consider ineligible.
- `GET /me/life-group-tasks` returns assigned/completed tasks from today (America/Sao_Paulo) onward.
