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

---

## Phase B3 — reminders evaluator, notifications, meeting-day helpers

### Files (under `backend/src/`)
- `reminders/types/reminder-config.ts`: `'life_group_tasks'` in `ReminderRuleType`; `LifeGroupTasksReminderConfig` (`days_before_meeting: number[]`, `hour`, `title`, `message`, `reminder_title`, `reminder_message`); `DEFAULT_CONFIGS` ([3,1], hour 9); new `validateReminderConfig()` (only constrains `life_group_tasks`), wired into `RemindersService.update` (400 on invalid). `reminders/entities/reminder-rule.entity.ts` enum list extended.
- `life-group-attendance/meeting-day.util.ts`: now exports `CHURCH_TIME_ZONE`, `ZonedParts`, `zonedParts`, `weekdayOf`, `dateKeyOf`, `shiftDays` (moved verbatim from the attendance evaluator, which now imports them; behavior and spec unchanged) and the new `nextMeetingDate(now, meetingDay)`.
- `reminders/evaluators/life-group-tasks.evaluator.ts` (+ spec), registered in `reminders.module.ts` (`REMINDER_EVALUATORS`; module imports `LifeGroupTasksModule`).
- `life-group-tasks/life-group-task-notifications.service.ts` (+ spec): real `LifeGroupTaskNotifier` (replaces the B2 no-op, which was deleted); also exposes `notifyAssignee`/`remindAssignee` for the evaluator. `LifeGroupTasksModule` now imports `NotificationsModule`.
- `notifications/notification-category.ts` (`life_group_task`), `notification-channel.ts` (-> `paz_life_group`); NOT added to `CATEGORY_PREF_MAP` (not opt-outable). `notification-channel.spec.ts` extended.
- `POST /life-groups/:id/tasks/generate`: `meeting_date` is now optional (defaults to `nextMeetingDate`, 400 if the group has no fixed day).

### Behavior
- Evaluator (hourly cron, acts when the church-timezone hour == `hour`): per group with fixed day/time and per offset, the meeting `offset` days ahead must fall on the group weekday. Largest offset: `generateForMeeting` (idempotent) then push to assigned, not-yet-notified members (`notified_at`); smaller offsets: push only to `assigned` members with `reminded_at IS NULL`, never generating. Skipped dates are ignored. Dedupe via `ReminderDispatchLog` key `life_group_tasks:{groupId}:{date}:d{offset}` (23505 tolerated); the `d{n}` key for reminder offsets is only written when someone was reminded. A failing group is logged and does not stop others.
- Push: category `life_group_task`, deep link `paz://tarefa/{assignmentId}`, `{task}` placeholder in message templates is replaced by the task name. Config rows seeded by the B1 migration lack `reminder_title/reminder_message`; the evaluator falls back to the defaults for any missing field (migration left untouched).
- Reroll/decline/manual: new assignee is pushed immediately (sets `notified_at`, so the d1 reminder still reaches them via `reminded_at`); decline and reroll also push the leader/co-leader; "no eligible member" pushes leader/co-leader (deduped per group/date/task set via `ReminderDispatchLog`).

### Not done
- Postman: the repo has no API collection (only an empty `admin-ui/postman/globals` file and `.postman/config.json` with no collections), so there was nothing to update; the endpoint list is in the B2 section above.
- `.ai/` docs and admin-ui/mobile category/rule-type lists are left to the docs / A1 / M phases.

---

## Phase A1 — admin-ui (life group rotating tasks)

### Files (under `admin-ui/`)
- New: `lib/api/types/life-group-tasks.ts` (exported from `types/index.ts`), `lib/api/endpoints/life-group-tasks.ts` (`lifeGroupTaskTemplatesApi`, `lifeGroupTasksApi`), `lib/hooks/use-life-group-tasks.ts`; typed analytics events added in `lib/firebase/analytics.ts`.
- New page `app/(dashboard)/tarefas-life/` (`page.tsx`, `life-group-tasks-management.tsx`, `life-group-task-template-form.tsx`): template table, create/edit dialog (name, description, markdown guidance via the existing `MarkdownEditor`), active toggle, up/down reorder (`PUT /life-group-task-templates/reorder`), delete with 409 handling (explains and suggests deactivating). Sidebar entry "Tarefas do Life" (Estudo section) is `roles: ["admin"]`; the page also shows a no-permission message for non-admins.
- New `components/life-group-tasks/`: `life-group-tasks-panel.tsx` (tabs), `life-group-task-meeting-tab.tsx` (date picker defaulting to next meeting weekday via `next-meeting-date.ts`, generate, per-task re-roll, manual reassign select, skip/unskip date, unassigned-task warning, "not eligible" badge), `life-group-task-overrides-tab.tsx` (enable/disable + guidance override with markdown editor, "use default guidance"), `life-group-task-members-tab.tsx` (group setting `min_present_meetings`, per-member eligibility toggle, source badge manual/leader/auto/pending with present count, "voltar ao automático", per-template exclusions, leader-only note).
- `app/(dashboard)/life-groups/life-groups-management.tsx`: new "Tarefas" row action opening a dialog with the panel.
- Reminder rules: `ReminderRuleType` + `LifeGroupTasksReminderConfig` types; `reminder-settings.tsx` titles/descriptions and `LifeGroupTasksControls` (days_before_meeting list, hour, title/message, reminder_title/message; client-side validation 0-30, non-empty).
- Notification category `life_group_task`: `NotificationCategory` type and the category list/labels in `notifications/notification-system.tsx`.

### Notes / deviations
- Markdown "live preview" uses the existing `MarkdownEditor` Escrever/Visualizar tabs (preview re-renders from live state) rather than a side-by-side pane; avoided refactoring the shared editor without being able to build.
- Reorder uses up/down buttons (no drag-and-drop dependency added; no new package.json dependency needed, `react-markdown`/`remark-gfm` already present).
- Backend stores reason/exclusions only on an explicit member-setting row, so "Salvar detalhes" pins the current eligibility as manual (stated in the UI).
- Next-meeting date is computed client-side from the group's `meeting_day` label (browser local date; the backend validates the weekday on generate).
- Not done: `.ai/` docs (docs phase). Pre-existing gap left untouched: backend rule type `life_group_attendance` is not in the admin-ui `ReminderRuleType`/title maps.

## Phase M1 (kmp-mobile/shared: domain, repository, DI)

### Files (under `kmp-mobile/shared/src/`)
- New `commonMain/.../domain/model/LifeGroupTask.kt`: `LifeGroupTask` (id, lifeGroupId, lifeGroupName, meetingDate, name, description, guidance (markdown), status), `LifeGroupTaskStatus` (ASSIGNED/DECLINED/COMPLETED/UNKNOWN), `LifeGroupTaskDeclineResult` (id, status, reassigned), `LifeGroupTaskMember` (userId, name, isLeader, isCoLeader, eligible, eligibilitySource, presentCount, minPresentMeetings, note (leader-only), excludedTemplateIds), `LifeGroupTaskEligibilitySource` (MANUAL/LEADER/AUTO/PENDING/UNKNOWN), `LifeGroupTaskMemberUpdate` (write model), `LifeGroupTaskSettings`, `LifeGroupTaskTemplateSummary` (templateId, name, description, isEnabled).
- New `commonMain/.../domain/repository/LifeGroupTaskRepository.kt`: `getMyTasks()`, `getMyTask(id)`, `declineTask(id)`, `getTaskMembers(lgId)`, `updateTaskMembers(lgId, updates)`, `getTaskSettings(lgId)`, `updateTaskSettings(lgId, min)`, `getTaskTemplates(lgId)`.
- New `commonMain/.../data/repository/LifeGroupTaskRepositoryImpl.kt` (Ktor, private DTOs with `@SerialName` snake_case, `throwOnClientOrServerError`, `@Throws(Exception::class)` like attendance).
- Edited `commonMain/.../di/SharedModule.kt` (Koin `single<LifeGroupTaskRepository>`) and `iosMain/.../di/IosAppContainer.kt` (`lifeGroupTaskRepository` lazy property).
- New `commonTest/.../LifeGroupTaskRepositoryTest.kt` (MockEngine, 8 tests).

### Notes / deviations
- Backend has no non-admin template listing, so `getTaskTemplates` derives from `GET /life-groups/{id}/task-overrides` (active templates only, with per-group `isEnabled`).
- Member `PUT task-members` body is built with `buildJsonObject` so null update fields are OMITTED (backend treats omitted as "unchanged"); `note = ""` clears the note, `excludedTemplateIds = emptyList()` clears exclusions. The wire field `reason` is exposed as `note` in the domain.
- Status/eligibility source are enums with an UNKNOWN fallback (forward-compat) rather than raw strings.
- Member endpoints map only the fields the backend returns (no note, no other members).
- No separate iOS wrapper: iOS uses `IosAppContainer.lifeGroupTaskRepository`, same as attendance.
