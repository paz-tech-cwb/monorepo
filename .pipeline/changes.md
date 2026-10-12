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

## Phase M2 (kmp-mobile/android: task guide screen)

### Files (under `kmp-mobile/android/src/`)
- New `main/.../ui/features/lifegrouptasks/`: `LifeGroupTaskGuideScreen.kt`, `LifeGroupTaskGuideViewModel.kt`, `LifeGroupTaskGuideUiState.kt` (UiState + `LifeGroupTaskGuideEffect.NavigateBack`). Shows task name, group name, meeting date (`dd/MM/yyyy` via `brDateString`), description, markdown guidance, and a destructive "Não posso" button with an `AlertDialog` confirmation; after decline shows a "Tarefa devolvida" state (copy differs when `reassigned`). Loading skeleton, `PazErrorState` retry, pull-to-refresh.
- Markdown: no markdown library exists in the version catalog, but `ui/components/MarkdownText.kt` (hand-rolled, used by the Estudo do Life screen) already did. Reused and extended it instead of adding a dependency: parsing moved to new pure `ui/components/MarkdownParser.kt` (`parseMarkdownBlocks`, `parseInline`, `isSafeLinkUrl`; `internal`, unit-tested); added ordered lists ("1. "), indented list items and `[label](url)` links (rendered with `LinkAnnotation.Url`, **only http/https**; other schemes such as `javascript:`/`intent:`/`file:` render the label as plain text). Existing heading/bold/italic/bullet behavior preserved.
- `navigation/Screen.kt`: `LifeGroupTaskGuide` = `life_group_task/{assignmentId}`; `PazNavGraph.kt`: composable for it (String arg `assignmentId`).
- `notifications/PushNotificationHelper.kt`: `paz://tarefa/{assignmentId}` -> `life_group_task/{assignmentId}` (null for a blank id or extra path segments).
- `di/AndroidModule.kt`: `viewModel { (assignmentId: String) -> LifeGroupTaskGuideViewModel(assignmentId, get()) }`; `LifeGroupDetailViewModel` now gets a third `get()` (LifeGroupTaskRepository).
- "Minhas tarefas" card on the life group detail screen (`ministries/MinistryDetailScreen.kt`, `MinistryDetailViewModel.kt`, `MinistryDetailUiState.kt`): `LifeGroupDetailViewModel` loads `getMyTasks()` best-effort (failure -> empty, never breaks the screen), keeps `ASSIGNED` tasks of this group sorted by meeting date; the card lists each task (name + date) and taps to the guide (`LifeGroupDetailEffect.NavigateToTask`). Card hidden when empty. Refreshes on resume like the rest of the screen.
- Tests: `LifeGroupTaskGuideViewModelTest`, `LifeGroupDetailViewModelTest` (tasks filtering/failure isolation), `MarkdownParserTest`, 3 new cases in `PushNotificationHelperTest`.

### Notes / deviations
- Strings are inline pt-BR literals, not `strings.xml`/`stringResource`: the whole Android app (0 `stringResource` usages; `strings.xml` only has `app_name`) follows that convention, so I matched it.
- Home screen card NOT added (not trivial: HomeViewModel/state would need extra wiring); the entry points are the life group detail card and the push deep link.
- `PazColors`/`MaterialTheme` tokens only; no new colors/dp tokens beyond the 20/22dp icon sizes already used on the same screen.
- iOS parity: route name `life_group_task/{assignmentId}`; deep link `paz://tarefa/{assignmentId}`.

## Phase M4 (Android: leader eligibility screen)

### Files (under `kmp-mobile/android/src/`)
- New `main/.../ui/features/lifegrouptasks/`: `LifeGroupTaskMembersScreen.kt`, `LifeGroupTaskMembersViewModel.kt`, `LifeGroupTaskMembersUiState.kt` (draft model, `sourceBadgeLabel()`, effect). Screen "Elegibilidade para tarefas": group setting `min_present_meetings` stepper (0..52), one card per member with eligibility `Switch`, source badge (Manual / Liderança / "Automático · N de M presenças" / "Pendente · N de M presenças"), expandable details with the leader-only note field (max 1000) and per-template exclusion checkboxes (only templates enabled for the group), "Voltar ao automático" (only for MANUAL members; undoable before saving), single "Salvar" button, pull-to-refresh, skeleton/error/empty states.
- Save flow: `updateTaskSettings` first (if the minimum changed, since it changes which members are automatically eligible), then `updateTaskMembers` with ONLY the dirty members (or `getTaskMembers` when only the setting changed); the response replaces the drafts. Per member the update carries `eligible` (backend requires it unless resetting; this pins the member as a manual decision, noted in the UI), `note`/`excludedTemplateIds` only when changed (empty string / empty list clear them), or only `resetToAutomatic=true`.
- `navigation/Screen.kt`: `LifeGroupTaskMembers` = `life_group_task_members/{lifeGroupId}`; `PazNavGraph.kt` composable; `di/AndroidModule.kt`: `viewModel { (lifeGroupId: Int) -> LifeGroupTaskMembersViewModel(lifeGroupId, get()) }`.
- Entry point: "Elegibilidade para tarefas" card on the life group detail screen, shown only when `canManageAttendance` (current user id == group `leaderId` or `coLeaderId`, the existing leader/co-leader gate used for "Presença"). `LifeGroupDetailEffect.NavigateToTaskMembers` added.
- Test: `LifeGroupTaskMembersViewModelTest` (13).

### Notes / deviations
- Gate is leader/co-leader of THIS group only (as requested); backend also allows admin, but admins manage it in admin-ui.
- The route arg is the group id as String; the screen converts with `toInt()` like the attendance screens.
- Same inline pt-BR strings convention as M2.
- iOS parity: route `life_group_task_members/{lifeGroupId}`; endpoints `GET/PUT /life-groups/:id/task-members`, `GET/PUT /life-groups/:id/task-settings`, `GET /life-groups/:id/task-overrides` (templates) via `LifeGroupTaskRepository`.

## Phase M3 (iOS: task guide, Minhas tarefas card, deep link)

### Files (under `kmp-mobile/ios/PazChurch/`)
- New `Features/LifeGroupTasks/`: `LifeGroupTaskGuideView.swift` + `LifeGroupTaskGuideViewModel.swift` (`@Observable @MainActor`; name, group, `dd/MM/yyyy` meeting date, "Sobre a tarefa" description, "Guia" markdown, destructive "Não posso" with confirmation alert, "Tarefa devolvida" state whose copy depends on `reassigned`, skeleton, `ErrorStateView` retry, pull-to-refresh), `LifeGroupMyTasksCard.swift`, `LifeGroupTaskMarkdownView.swift`.
- Markdown: small custom block renderer (headings, bullet/ordered lists incl. indent, paragraphs) with inline bold/italic/links via `AttributedString(markdown:)` in inline-only mode. Links are tappable only for http/https with a host; any other scheme has its link attribute stripped (label stays plain text). Existing `MarkdownBodyView` was left untouched (no list numbering/link sanitizing; used by studies).
- `Navigation/DeepLinkDestination.swift`: `.lifeGroupTaskGuide(assignmentId:)` (home stack), parsing of `tarefa/{id}` (blank id or extra path segments -> nil, same as Android). `Services/PushNotificationService.swift`: `paz://tarefa/` -> `tarefa/{id}`. `Navigation/MainTabView.swift`: tab 0 + destination view.
- `Features/Ministries/MinistryDetailView.swift` (`LifeGroupDetailView`): "Minhas tarefas" card; `getMyTasks()` best-effort (failure -> hidden), filters `ASSIGNED` of this group, sorted by date; loaded in `.task` and on pull-to-refresh; card hidden when empty.
- `PazChurch.xcodeproj/project.pbxproj`: hand-edited (xcodegen not installed; the pbxproj is checked in with explicit file refs): new `LifeGroupTasks` group + file refs/build files. `plutil -lint` OK.

### Notes / deviations
- Home screen card not added (parity with Android). No `onDismiss` plumbing for the guide: "Voltar" uses `dismiss()`, which pops both the Home-stack deep link and the pushed card route.
- iOS copy is inline pt-BR, identical to Android.

## Phase M4 (iOS: leader eligibility screen)

### Files
- New `Features/LifeGroupTasks/LifeGroupTaskMembersView.swift` + `LifeGroupTaskMembersViewModel.swift` (includes `LifeGroupTaskMemberDraft`). "Elegibilidade para tarefas": explanatory leader-only note, "Presenças mínimas" `Stepper` 0..52, per-member card with eligibility `Toggle`, role (Líder/Co-líder), source badge (Manual / Liderança / "Automático · N de M presenças" / "Pendente · N de M presenças" / "Voltará ao automático ao salvar"), expandable details (note field capped at 1000, per-template exclusion checkboxes for enabled templates only, "decisão manual" hint), "Voltar ao automático" (MANUAL only) with "Desfazer", pull-to-refresh, skeleton/error/empty states, "Salvar" button (disabled without changes).
- Save semantics identical to Android: `updateTaskSettings` first when the minimum changed, then `updateTaskMembers` with only dirty members (or `getTaskMembers` when only the setting changed); eligible always sent unless reset; note/exclusions only when changed (empty clears); reset sends only `resetToAutomatic`; response replaces drafts.
- Entry point: card in `LifeGroupDetailView`, shown under the existing `canManageAttendance` leader/co-leader gate. pbxproj updated.

### Notes
- Shared API bridging assumptions (unverified without a framework build): Kotlin `description` property -> `description_`; `List<Int>` -> `[KotlinInt]`; nullable `Boolean` -> `KotlinBoolean?`; enums -> `.assigned/.manual/...`; `LifeGroupTaskMemberUpdate` init takes every parameter (no Kotlin defaults in Swift).

## Review / Fix (Arnold)

Fixed from `.pipeline/review.md`:
- M1: `life_group_task_assignments.user_id` now `ON DELETE CASCADE` (migration 1795900000004, edited in place since it has not run; entity `onDelete: 'CASCADE'`). Other new FKs already fine: member_settings.user_id CASCADE, updated_by/created_by SET NULL, group FKs CASCADE; assignments.template_id has no cascade on purpose (template delete is refused once used; deactivate instead).
- M2: `buildMembers` hides the `grandfathered at migration` note (`reason: null`) and returns `grandfathered: boolean` (constant `GRANDFATHERED_REASON` in the member-setting entity). `putMembers` keeps the marker when a client sends a blank note (clients no longer see it, so "Salvar detalhes" must not erase it). admin-ui, Android (`LifeGroupTaskMember.grandfathered`, shared DTO default false) and iOS hide "Voltar ao automático" for grandfathered rows and label them "Membro antigo (participa)". Tests: config.service.spec, repository test, Android ViewModel test.
- m1: Android `parseInline`: `_` italics only at word boundaries, `*`/`_` openers must be followed by non-space and closers preceded by non-space, unmatched `**`/`*`/`_` become literal and parsing continues (tests added).
- m4: `generate` rejects meeting_date > 7 days in the past or > 60 days ahead (400); spec updated, existing specs switched to a date computed from today.
- m6: admin-ui `nextMeetingDate` computes "today" in America/Sao_Paulo.
- m8: `PazNavGraph` ignores a non-numeric `lifeGroupId` route arg instead of crashing.

Left as follow-ups: m2 (preview vs mobile markdown subset), m3 (no notification after manual generate inside the offset window), m5 (decline ping-pong: the row is reassigned in place so earlier decliners are not tracked; fixing it needs a decliner history column, not trivial), m7 (index/constraint names vs TypeORM), m9 (evaluator claim-then-send), m10 (nothing compiled or run). Known edge: a leader who writes a real note on a grandfathered member replaces the marker, after which the reset button reappears.


---

## Gap fixes (admin-ui)

- `components/markdown-editor.tsx`: preview markup extracted into `MarkdownPreviewContent` (unchanged styling); new optional `splitPreview` prop. When set and viewport >= 1024px (`lg`, via `useSyncExternalStore` + matchMedia, SSR-safe false) the editor shows editor left / live preview right; narrower screens keep the Escrever/Visualizar tabs. Other callers unaffected (default false).
- `life-group-task-template-form.tsx`: passes `splitPreview`; dialog widened (`sm:max-w-3xl lg:max-w-5xl`, the base dialog's `sm:max-w-lg` previously overrode `max-w-3xl`); helper text updated.
- `life-group-tasks-management.tsx`: native HTML5 drag-and-drop row reorder (no dnd lib in package.json; no new dependency) with grip icon, drag/over styling; up/down buttons kept as keyboard fallback with per-task aria-labels; both go through `moveTemplate` -> existing `PUT /life-group-task-templates/reorder`.
- `lib/hooks/use-life-group-tasks.ts`: `useReorderLifeGroupTaskTemplates` now optimistic (`onMutate` reorders cache, `onError` rolls back to snapshot; success still sets server list + invalidates).
- Members tab: already used `grandfathered` as the sole source for hiding "Voltar ao automatico" and the "Membro antigo" badge; no marker-text dependency existed in code. Only the type comments in `lib/api/types/life-group-tasks.ts` were clarified.

## Gap fixes (mobile)

- Markdown parity: fenced code blocks, inline code and blockquotes on Android (`MarkdownParser.kt` `CodeBlock`/`Quote`/`InlineSpan.Code`, rendering in `MarkdownText.kt`: monospace + tinted background, quote bar + italic) and iOS (`LifeGroupTaskMarkdownView.swift` `.code`/`.quote`; inline code via the inline markdown parser). http/https-only link safety unchanged; links inside code stay literal. Tests added to `MarkdownParserTest`.
- Home "Minhas tarefas" card (Android + iOS): `getMyTasks()` best-effort in the home view model (failure -> empty -> card hidden, no home error), filter status assigned + `meetingDate >= today`, sorted by date, max 3; rows open the guide (Android `HomeEffect.NavigateToTask` -> `life_group_task/{id}`; iOS NavigationLink to `LifeGroupTaskGuideView`). Android reuses `MyTasksCard` (now `internal`, with a `modifier`); `HomeViewModel` gets `LifeGroupTaskRepository` (`AndroidModule.kt` updated); iOS `HomeViewModel` takes `taskRepository`. New `HomeViewModelTest`.
- Backend contract: no client depends on the grandfathered note marker (grep for "grandfathered at migration" in kmp-mobile: none); clients use only the `grandfathered` boolean. `declined_user_ids` not consumed.
- iOS tests: NO test target added. Reasons: app target depends on Shared.xcframework via a Gradle prebuild, xcodegen is unavailable so project.yml/pbxproj/scheme cannot be regenerated or compiled to verify, and a bad hand edit would break the checked-in scheme used by CI. Logic left testable (non-private statics); details in `.ai/apps/mobile.md`.

## Gap fixes (backend)

### Files
- Migration `backend/database/migrations/1795900000004-CreateLifeGroupTasks.ts` (edited in place, never ran): `life_group_task_assignments.declined_user_ids int[] NOT NULL DEFAULT '{}'`; `life_group_task_member_settings.grandfathered boolean NOT NULL DEFAULT false`; the grandfather INSERT now sets `grandfathered = true` and no `reason` text. `down()` is unchanged and still correct (drops the tables that own both columns).
- Entities: `life-group-task-assignment.entity.ts` (`declinedUserIds`), `life-group-task-member-setting.entity.ts` (`grandfathered`; `GRANDFATHERED_REASON` removed).
- `life-group-task-assignments.service.ts`: decline appends the decliner (also on the "nobody left" path); `pickReplacement` (decline + leader re-roll) excludes the current assignee and everyone in `declined_user_ids`; manual `reassign` is unchanged (explicit leader choice); `generate()` now notifies created assignees via `notifier.notifyGenerated` (failure is logged, never fails the request).
- `life-group-task-notifier.ts`: new abstract `notifyGenerated(notices)`.
- `life-group-task-notifications.service.ts`: per-assignment claim (`em.update(..., {id, notifiedAt|remindedAt: IsNull()}, {col: now})`, `affected` = claimed) before pushing, released (set NULL) on send failure, for `notifyAssignee`, `remindAssignee` and the assignee push in `notifyReassigned`; `notifyUnassignable` claims its dispatch key first and releases on failure; `notifyGenerated` implemented (reads the `life_group_tasks` rule: skipped when disabled, only meetings from today to today + largest offset, uses rule title/message).
- `dispatch-claim.ts` (new): `claimDispatchKey` (insert, 23505 => false) / `releaseDispatchKey` (best-effort delete).
- `reminders/evaluators/life-group-tasks.evaluator.ts`: claim-first; release on failure, skipped generation, or d-1 with nobody to remind. `reminders/types/reminder-config.ts`: shared `resolveLifeGroupTasksConfig`.
- `life-group-task-roster.service.ts`: present-count query joins `user_life_groups` and counts only `meeting_date >= joined_at` (Sao_Paulo day); also loads `joined_at` (`RosterMember.joinedAt`).
- `life-group-task-config.service.ts`: `grandfathered` from the column, `reason` is the real note, new `joined_at`; `putMembers` never touches the flag and answers 400 to `reset_to_automatic` on a grandfathered row (whole request rejected, nothing saved).
- Specs: notifications, assignments, config, evaluator updated; new `life-group-task-roster.service.spec.ts`.
- Docs: `.ai/features/life-groups.md`, `.ai/features/notifications.md`, `.ai/apps/backend.md`; `.pipeline/spec.md` decision 11.

### Wire contract changes (for admin-ui / Kotlin / Swift agents)
- `GET/PUT /life-groups/:id/task-members` items: `grandfathered` (bool, now from the column; same name as before), NEW `joined_at` (ISO-8601 string, or null for a leader/co-leader without a join row; optional for clients), `reason` is now always the real leader note (the system note no longer exists; a grandfathered row has `reason: null` until the leader writes one).
- `PUT /life-groups/:id/task-members`: an entry with `reset_to_automatic: true` for a grandfathered member now returns 400 (`User N is grandfathered and cannot be reset to automatic; set eligible=false instead.`) and the whole request is rejected. A blank/omitted note no longer needs special handling by clients.
- `POST /life-groups/:id/tasks/generate`: response shape unchanged; side effect: newly created assignees get a push when the meeting is within the largest offset (default 3 days).
- Decline/re-roll responses unchanged. No other endpoint changed. `present_count` semantics: counts only meetings on/after `joined_at`.

### Notes / deviations
- Manual generate only pushes when the meeting is within today..today+largest offset (past dates and farther dates are left to the evaluator): pushing a meeting weeks ahead would use up `notified_at` and suppress the real d-3 push. Because `notified_at` gates each assignee, the evaluator does not double-send; no extra group-level ReminderDispatchLog key is written by the manual path.
- A process killed between claim and release leaves that dispatch key claimed (that offset is not retried); accepted trade-off of claim-first.
- Postman: no collection exists in the repo (`admin-ui/postman/globals/workspace.postman_globals.json` is an empty globals file, `admin-ui/.postman/config.json` is workspace config only), so nothing was updated.

## Round 2 fixes (Arnold)

- [M3] `backend/database/migrations/1795900000004-CreateLifeGroupTasks.ts`: now safe for DBs that ran an earlier revision. After the CREATE TABLEs: `ADD COLUMN IF NOT EXISTS declined_user_ids int[] NOT NULL DEFAULT '{}'` (assignments), `ADD COLUMN IF NOT EXISTS grandfathered boolean NOT NULL DEFAULT false` (member settings), `UPDATE ... SET grandfathered = true, reason = NULL WHERE reason = 'grandfathered at migration'`, and a `DO $$` block that finds an `assignments.user_id -> users` FK whose `confdeltype <> 'c'` and re-creates it with ON DELETE CASCADE. All idempotent; `down()` unchanged (drops the tables and `joined_at`). Not exercised against a live Postgres (none available).
- Lint/format: `prettier --write` + typed-mock fixes (`jest.fn<Ret, Args>`, `asError` helper for rejections, `saveMock` in reminders spec) on the 49 feature files only; scoped eslint has 0 errors, no rule disabled.
- admin-ui `life-group-task-meeting-tab.tsx`: skip toggle branches `removeSkip.mutate` / `addSkip.mutate` with one shared typed options object (tsc back to the 28 baseline).
- m12: evaluator generate/remind loops catch and log per assignment and continue; the group claim is released only when every attempted send failed (so the next tick retries), otherwise it is kept (per-assignment claims dedupe the rest).
- m13: `applyReassignment` wraps `notifyReassigned` in try/catch + log; the committed reassignment is returned instead of a 500.
- m16: roster SQL takes `CHURCH_TIME_ZONE` as bind `$2`.
- m17: `useIsWide` subscribe/getSnapshot/getServerSnapshot hoisted to module scope.
- m15: optional `joined_at` declared in admin-ui `LifeGroupTaskMember` (`joined_at?: string | null`), Kotlin `TaskMemberDto` (`joinedAt: String? = null`) and domain `LifeGroupTaskMember` (`joinedAt: String? = null`, last param). Swift untouched (reads Kotlin model, field simply unused).
- m20: iOS `HomeViewModel.load` uses do/catch; `CancellationError` returns without clearing `myTasks`, other errors clear it (matches Android).

### Accepted follow-ups (not fixed)
- m11: a process crash/restart between the claim and the push leaves the claim set with nothing sent (stuck claim, at-most-once); small window.
- m18: drag-drop `draggable` is on the whole `<tr>` and there is no `onSettled` invalidate.
- m19: Android/iOS markdown paragraph/bullet minor differences.

## Round 3 (Owen/Sattler)

- [m14 fixed] `notifyGenerated` (`life-group-task-notifications.service.ts`) now also skips notices whose meeting is the largest-offset day when the current America/Sao_Paulo hour is before the rule's `hour` (the evaluator still runs later today; `notified_at` stays NULL). At/after the hour the push goes out as before. Specs added (fake timers: 08:00 skip, 08:00 mixed window, 09:30 push).
- Evaluator spec: new per-assignment failure block (one notify throws -> others still sent, group claim kept; all fail -> claim released; nothing pending -> claim kept; remind loop continues after a throw).
- Docs: `.ai/features/notifications.md`, `.ai/features/life-groups.md` updated.

- [M3 re-fix] migration 1795900000004: defensive upgrade block moved before the grandfather INSERT (it referenced the `grandfathered` column before the ADD COLUMN on earlier-revision DBs); verified on a real Postgres, see `.pipeline/test-results.md` "Migration test (throwaway Postgres)". Replaces the earlier "not exercised against a live Postgres" note.

## Round 3
- Malcolm round 3: SHIP (no blockers/majors). m22 (iOS home cancellation via Task.isCancelled) and m26 (stale CI comment) fixed.
- Accepted: m23 (partial evaluator failure keeps group claim; failed item not retried at that offset, smaller-offset reminder or manual generate still reaches it), m24 (if the scheduler misses the exact hour tick, a pre-hour manual generate at the largest offset gets no push; d-1 reminder still goes), m25 (re-running 1795900000004 on an old-revision DB grandfathers members who joined in between; unrecorded dev DBs only), m27 (tracked xcuserdata predates branch).

## Backend (home-card branch)

Phase 0 (commit 852e7fa): characterization spec with a real Nest app, the exact main.ts `ValidationPipe` and `ClassSerializerInterceptor` (excludeAll + excludeExtraneousValues). Confirmed on the unmodified code: `GET /forms/life-group-reports` and `/:id` serialize to `{}` (also `/:id/audit` collapsed to `[{}]`), and `/:id` and `/:id/audit` return data to a plain member with an empty scope (no object-level check).

Phase 1 (`backend/src/life-group-reports/`):
- `life-group-reports.controller.ts`: `@SerializeOptions({strategy:'exposeAll', excludeExtraneousValues:false})`; `list(req, @Query() ListLifeGroupReportsQueryDto)`; `findOne`/`audit` pass `req.formScope` + actor; all handlers typed `RequestWithScope`.
- `dto/list-life-group-reports-query.dto.ts` (new): optional `life_group_id` (`@Expose @IsOptional @Type(Number) @IsInt @Min(1)`).
- `life-group-reports.service.ts`: public `toResponse` (snake_case, `submitted_by {id,name}`); `list(scope, actor, lifeGroupId?)` = scope groups + groups where actor is leader/co-leader (`@InjectEntityManager`, same query as analytics), 403 when the filter is outside the allowed set, `1=0` when nothing allowed; private scope-aware `findEntity` (in scope, submitter, or leader/co-leader of the group, else 404); `findOne`/`auditLog` scoped; `update`/`create` return `toResponse` (create reloads to include author name); `update` keeps the unscoped load plus its own edit policy. Module unchanged.
- Specs (new): `life-group-reports.service.spec.ts` (toResponse, list matrix incl. co-leader fallback / two-group leader / member / 403 / filter, findOne+audit 404 matrix, update) and `life-group-reports.controller.spec.ts` (snake_case body not `{}`, `?life_group_id=10` reaches the query as number, 403, 400 on `abc`, 404 on detail+audit for out-of-scope). The Phase 0 characterization spec was removed in the same change (superseded; it stays in git history at 852e7fa).
- admin-ui: no change needed. `LifeGroupReport`/`FormSubmissionMeta` types and `_columns.tsx` already expect snake_case plus `submitted_by:{id,name}`, which the list now actually returns (previously `{}`). Not run: admin-ui tsc/eslint (untouched).
- Docs: `.ai/features/life-groups.md` (new "Weekly life group reports (read API)" section), `.ai/apps/backend.md`. Postman: still no collection in the repo (`.ai/apps/postman-files.md`), nothing updated.
- Wire contract for mobile: `GET api/forms/life-group-reports?life_group_id={int}` -> JSON array of the snake_case objects above; `GET api/forms/life-group-reports/{uuid}` -> one object; errors 403 (filter group not accessible), 404 (detail not visible), 400 (non-numeric id).

## Shared + Android (home-card branch)

Owen. Backend wire contract verified against commit d53f9a9 (`toResponse` snake_case, `submitted_by {id,name}`, 403 on filter outside scope, 404 detail out of scope).

Shared (`kmp-mobile/shared`, commit a059f3e):
- `domain/model/LifeGroupReport.kt`: `LifeGroupWeeklyReport` (domain; multi-value fields are `List<String>`, `offering` String).
- `domain/repository/LifeGroupReportRepository.kt` + `data/repository/LifeGroupReportRepositoryImpl.kt`: `getReports(lifeGroupId: Int)` -> `GET api/forms/life-group-reports?life_group_id=`, `getReport(reportId: String)`; private snake_case DTO, tolerant of array/string and number/string variants.
- DI: `SharedModule` (`single<LifeGroupReportRepository>`), `IosAppContainer.lifeGroupReportRepository`.
- `domain/model/HomeLifeGroupCard.kt`: `HomeLifeGroupCard`, `HomeLifeGroupCards`, `selectUpcomingLifeGroupTasks`, `buildHomeLifeGroupCards`.
- Tests: `LifeGroupReportRepositoryTest` (5), `HomeLifeGroupCardTest` (7).

Android (`kmp-mobile/android`):
- Home: `HomeUiState` (`lifeGroupCards`, `hiddenLifeGroupsCount`, `legacyTasks`; `myTasks` removed), `HomeViewModel` (independent groups/tasks fetches, cancellation rethrown, `onLifeGroupTapped`, `onSeeAllLifeGroupsTapped`; wrapper `selectUpcomingTasks` removed in favour of the shared function), `HomeScreen` (`LifeGroupHomeCard`, "Ver todos (N)", legacy `MyTasksCard` only when groups failed). Constructor of `HomeViewModel` unchanged (Koin `get()` count stays 4).
- `ministries/MinistryDetailScreen.kt`: `MyTasksRows` extracted from `MyTasksCard` and reused by the home card; "Relatórios" gate -> `canViewGroupReports`; new "Relatórios semanais" row; meeting line via new `LifeGroupMeetingLabel.kt`. `MinistryDetailViewModel.kt`: `canViewLifeGroupReports` (pure, internal), `onReportsTap`, effect `NavigateToReports`. `LifeGroupDetailViewModel` constructor unchanged.
- New `ui/features/lifegroupreports/`: `LifeGroupReportsViewModel` + `LifeGroupReportDetailViewModel`, UiState/Effect, `LifeGroupReportsScreen`, `LifeGroupReportDetailScreen`.
- Analytics: `isScopedToGroup` (set when a `lifeGroupId` is supplied) hides the group dropdown.
- Nav: `Screen.LifeGroupReports` (`life_group_reports/{lifeGroupId}`), `Screen.LifeGroupReportDetail` (`life_group_report/{reportId}`), `PazNavGraph`; Koin in `AndroidModule`: `LifeGroupReportsViewModel(lifeGroupId: Int, get())`, `LifeGroupReportDetailViewModel(reportId: String, get())`.
- Tests: `HomeViewModelTest` rewritten for cards/fallback (8), `LifeGroupDetailViewModelTest` gate matrix (+2), new `LifeGroupReportsViewModelTest` (10), `LifeGroupAnalyticsViewModelTest` scoped (+1).
- Deviation: `LifeGroupHomeCard` header uses `Surface(onClick=)` per kmp-mobile guidelines; no role chip on the card (spec marked it optional).
- Docs: `.ai/features/mobile-app.md`, `.ai/apps/mobile.md` (Android+shared; the stale "no iOS unit-test target" paragraph is left for the iOS agent).

## iOS (home-card branch)

Owen. Mirrors the Android implementation; uses the shared `buildHomeLifeGroupCards` (Swift: `HomeLifeGroupCardKt`) and `LifeGroupReportRepository` (`IosAppContainer.shared.lifeGroupReportRepository`).

- Home: `HomeViewModel` (`lifeGroupCards`, `hiddenLifeGroupsCount`, `legacyTasks`; `myTasks` removed; pure `resolveLifeGroups(currentUserId:groups:tasks:today:)`; independent groups/tasks fetches, `FetchOutcome` with cancellation keeping current state; `upcomingTasks` is now a thin wrapper over the shared `selectUpcomingLifeGroupTasks`). `HomeView`: per-group `LifeGroupHomeCard` items, "Ver todos (N)" row to `LifeGroupsView`, legacy `LifeGroupMyTasksCard` only when groups failed, discovery CTA unchanged. New `Features/Home/LifeGroupHomeCard.swift` (header `NavigationLink` to `LifeGroupDetailView`, task rows as sibling links; also holds `lifeGroupMeetingLabel(day:time:)`, now used by the detail screen). `LifeGroupTaskRows` extracted from `LifeGroupMyTasksCard`.
- Detail: `LifeGroupDetailView.canViewGroupReports(role:isGroupLeadership:)` (static, pure); "Relatórios" gate changed to it; new "Relatórios semanais" row.
- New `Features/LifeGroupReports/`: `LifeGroupReportsViewModel`/`LifeGroupReportDetailViewModel` (`@Observable @MainActor`, loading/refreshing/error/noAccess; 403 = no access on the list, 403/404 on the detail, status read via `kotlinException.httpStatusCodeOrNull()` like the analytics VM), `LifeGroupReportsPresentation` (pure failure mapping, sort, offering/activity formatting), `LifeGroupReportsView`, `LifeGroupReportDetailView`.
- Analytics: `LifeGroupAnalyticsViewModel.isScopedToGroup`; the group picker is hidden when scoped.
- Project: 4 new app sources + `LifeGroupReportsTests.swift` hand-registered in `project.pbxproj` (new `LifeGroupReports` group; `plutil -lint` OK). `project.yml` needs no edit: its sources are directory globs (`PazChurch`, `PazChurchTests`); xcodegen is not installed, so it was not regenerated.
- Tests: `HomeViewModelTests` (+7: card ordering/folding, cap + hidden count, groups-failed legacy fallback with no CTA, both failed, tasks failed, empty groups CTA, meeting label), new `LifeGroupReportsTests` (gate matrix, failure mapping, formatting, list/detail view models with a fake repository).
- Docs: `.ai/apps/mobile.md` (stale "no iOS unit-test target" paragraph replaced; iOS sections), `.ai/features/mobile-app.md`.
- Deviations: none from the spec. No role chip on the card (same as Android). Swift stale-key note: Kotlin enum `UserRole.area_leader` is `.areaLeader` in Swift.

## Review fixes (home-card branch)

Arnold, from Malcolm's `.pipeline/review.md`.

- M1 (backend): `LifeGroupReportsService.auditLog` maps rows to the admin-ui `AuditLogEntry` shape `{id, form_slug, submission_id, action, diff, created_at, actor:{id,name}}`; the actor `User` is no longer serialized (no email/phone). Service and controller specs updated, with assertions that no `email`/`phoneNumber` is present.
- Minor 1: ASCII import order fixed in `AndroidModule.kt`, `PazNavGraph.kt`, `SharedModule.kt`, `IosAppContainer.kt` (incl. the older `LifeGroupTask`/`LifeGroupStudy` pairs). A scan of every `.kt` file touched by the branch found no other violations (`java.*`/`kotlin.*` last, per the ktlint layout).
- Minor 2: `LifeGroupDetailView.canViewGroupReports` is now `nonisolated static` (pure), so the gate tests need no actor isolation. Verified by compiling and running the tests.
- Minor 3: Android `LifeGroupReportsViewModel.load()`/`refresh()` are block-bodied.
- Minor 4: a failed refresh with a populated list keeps the list. Android emits a new `LifeGroupReportsEffect.ShowError` (snackbar); iOS sets a transient `refreshError` (alert). A failure with no content, or a 403, behaves as before. Tests added or adjusted on both platforms.
- Minor 5: `Modifier.fillMaxWidth()` on the Android home-card header `Surface`.
- Minor 6 (backend): `findEntity` no longer grants read access to the original submitter, so detail/audit visibility equals list visibility (form scope plus led groups). The alternative (adding the submitter to the list filter) was not chosen because it needs a join-column assumption that cannot be verified cheaply. Service spec updated; docs corrected.
- Minor 7: iOS `LifeGroupReportDetailViewModel.load` resets `isLoading` on cancellation (the next `.task` run sets it again).
- Minor 8: no change. `canManage` (Android `LifeGroupDetailUiState` and iOS `MinistryDetailView`) is still read by `onManageTap` / the manage entry, so it is not unused.
- Minor 9 (Postman): no life-group-reports entry exists in `.ai/apps/postman-files.md` and no collection exists in the repo, so nothing was updated. The spec's Postman deliverable remains not done.

## Pilot readiness: study push, Membros icon, rotating tasks (Owen)

- B backend: migration `1795900000005-AddLifeGroupStudyNotificationCategory` (enum value `life_group_study` was missing from every migration). `LifeGroupStudyAccessService.resolveNotificationRecipients(excludeUserId)` now returns roster members + leaders + co-leaders + leadership roles (deduped, publisher excluded); `canPublish` matches `leader_id` as well as `co_leader_id`. Study push stores `segment.filters.user_ids`. Controller create/update/delete lost `@Roles(...LEADERSHIP_ROLES)` (service `canPublish` decides, so grant holders / `member`-role leaders are no longer 403'd). Update/delete require the owner to still hold publish rights. No mobile change needed: both apps already parse `paz://estudo-do-life/{id}` (tests exist).
- C: people icon on the "Membros" row: iOS `MinistryDetailView.swift` (ministry + life group), Android `MinistryDetailScreen.kt` (ministry row; the Android life group screen has no Membros row).
- D: evaluator d1 pass generates when a meeting has no assignment rows (late setup). Docs: starter template list in `.ai/features/life-groups.md`.
