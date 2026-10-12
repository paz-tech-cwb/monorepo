# Spec: Life group rotating tasks

## Feature request summary
Admin (admin-ui) defines task templates for life groups (e.g. Palavra, Louvor/Ministracao, Oferta, Church Vision talk), each with name, description, guidance. The backend fairly/randomly assigns each task to a member for each upcoming life-group meeting, replacing the WhatsApp "raise your hand" flow. Assigned members get a push ("you were randomly assigned X for the next life group"); tapping opens a guide screen in the mobile app (Android + iOS via kmp-mobile) showing the admin-authored name, description and guidance.

## `.ai/` context read
`.ai/README.md` (via CLAUDE.md); `.ai/features/notifications.md`, plus prior plan verified against code. TO READ before implementation (Owen): `project.md`, `architecture.md`, `conventions.md`, `commands.md`, `feature-map.md`, `features/life-groups.md`, `features/mobile-app.md`, `apps/{backend,admin-ui,mobile,postman-files}.md`, `backend/CLAUDE.md`, `admin-ui/CLAUDE.md`, `kmp-mobile/CLAUDE.md`.

## Verified against code (deltas vs prior plan)
- Latest migration is `1795900000002-AddImageUrlToLifeGroups.ts` (hand-written, `IF NOT EXISTS` style, class name suffixed with timestamp). New migration must be > 1795900000002. Entities register in `backend/src/configs/orm.config.ts` (LifeGroupAttendance at ~L105).
- Members of a group: `users` <-> `life_groups` ManyToMany via join table `user_life_groups` (`user_id`, `life_group_id`); `users.status` varchar default `'active'`. Leader = `life_groups.leader_id`, co-leader = `co_leader_id`; `meeting_day` (PT weekday label or "Sem dia fixo"), `meeting_time` (time, nullable). Leader/co-leader may or may not also be in `user_life_groups` -> pool query must UNION + dedupe.
- **Correction:** `zonedParts`, `weekdayOf`, `dateKeyOf`, `shiftDays`, `CHURCH_TIME_ZONE` are private to `reminders/evaluators/life-group-attendance-reminder.evaluator.ts`; `life-group-attendance/meeting-day.util.ts` currently only has `WEEKDAY_INDEX` and `weekdayOfDateString`. Refactor = move those helpers into `meeting-day.util.ts` (export), add `nextMeetingDate(now, meetingDay)`, make the attendance evaluator import them; its spec must pass unchanged.
- Auth pattern to mirror: `LifeGroupAttendanceController` uses `@UseGuards(AuthGuard('jwt'), ScopeGuard)` + `@SerializeOptions({strategy:'exposeAll', excludeExtraneousValues:false})` (required for plain-object returns) and the service has `assertCanAccess(lifeGroup, scope, actor)` with `co_leader_id` fallback. Admin template CRUD should follow `life-group-studies` (`@Roles` + `RolesGuard`, `LEADERSHIP_ROLES` constant in `common/constants/leadership-roles`).
- Notifications: `notification-category.ts` has `NOTIFICATION_CATEGORIES` (add `life_group_task`); `notification-channel.ts` `CATEGORY_CHANNEL_MAP` is `Record<NotificationCategory,string>` so TS forces the new entry -> `'paz_life_group'` (channel already exists on Android). `CATEGORY_PREF_MAP` (notification-dispatch.service.ts) deliberately omitted => not opt-outable.
- Existing push deep-link routing to extend: Android `notifications/PushNotificationHelper.kt` (+ `PushNotificationHelperTest.kt`), iOS `Services/PushNotificationService.swift` (L94 `paz://presenca/` pattern) and `Navigation/DeepLinkViews.swift`/`DeepLinkDestination`.
- Mobile precedent for a full shared slice: `LifeGroupAttendance` (domain model, `LifeGroupAttendanceRepository`, `LifeGroupAttendanceRepositoryImpl`, `SharedModule.kt`, `IosAppContainer.kt`, `LifeGroupAttendanceRepositoryTest`); iOS `Features/LifeGroupAttendance/`; Android entry card lives in life group/ministry detail screens. Admin-ui precedent: `app/(dashboard)/estudo-do-life/`, `life-groups/life-groups-management.tsx`.
- `.pipeline/` previously held an unrelated task; archived under `.pipeline/archive/*-before-life-group-tasks-2026-10-12.md`.

## Affected apps
backend (new module + reminders + notifications), admin-ui, kmp-mobile (shared, android, ios), docs (.ai), Postman.

## Data model (new tables, one hand-written migration, e.g. `1795900000003-CreateLifeGroupTasks.ts`)
- `life_group_task_templates`: id, name, description (text), guidance (text, markdown), sort_order int, is_active bool default true, created_at, updated_at.
- `life_group_task_overrides`: id, life_group_id FK, template_id FK, is_enabled bool, guidance_override text null; unique (life_group_id, template_id).
- `life_group_task_assignments`: id, life_group_id, template_id, meeting_date date, user_id, task_name/task_description/task_guidance (snapshots at assignment time, so later template edits don't rewrite history; guidance snapshot already applies the group override), status `assigned|declined|completed`, source `auto|manual|reroll`, notified_at timestamptz null, created_at, updated_at; unique (life_group_id, template_id, meeting_date); indexes on (user_id, meeting_date), (life_group_id, meeting_date).
- `life_group_task_member_settings` (NEW requirement: per-member eligibility): id, life_group_id FK, user_id FK, eligible bool default true, reason text null (leader note, never shown to the member), excluded_template_ids int[] null (per-template exclusions, e.g. someone uncomfortable with Louvor; alternative: child table `..._member_template_exclusions` if FK integrity is preferred), updated_by, created_at, updated_at; unique (life_group_id, user_id). Absence of a row = eligible (default true), so existing/new members need no backfill.
- `life_group_task_group_settings` (or columns on overrides-level group row): life_group_id unique, `auto_exclude_inactive` bool default false, `inactive_after_absences` int default 4 (not present in the last N recorded meetings), `min_days_since_joined` int default 0. Per-member explicit setting always wins over the automatic rule.
- A skip table/flag (`life_group_task_skips` (life_group_id, meeting_date)) if OQ5 is approved.

## Backend: `backend/src/life-group-tasks/`
- `assignment-engine.ts`: pure function with injectable RNG. Pool = active members (+co-leader; leader only if `include_leader`) filtered by eligibility: drop members with `eligible=false`; if group `auto_exclude_inactive` is on, drop members with >= N consecutive absences in the last N `life_group_attendance` records (join `life_group_attendance_entries.present`, verified entity exists) or joined < min_days_since_joined (`user_life_groups` has no join date today; use `users.membership_date`/`created_at` — verify, may need a column, see OQ14) unless an explicit per-member row says eligible=true. Per-template exclusions are applied per task (candidate set for template T excludes members whose `excluded_template_ids` contains T). The engine receives the already-resolved eligibility as input (pure; DB resolution lives in the service). If a task ends up with zero candidates it is left unassigned and surfaced to the leader (admin panel flag + leader push 'no eligible member for X'), never force-assigned to an ineligible member. Reroll and decline use the same eligibility filter (plus excluding current assignee/decliner). Per task in sort_order: candidates = pool minus already-assigned-this-meeting (when members >= tasks); keep those with minimum historical assignment count (any template), prefer those who never did this template; random pick via RNG. When members < tasks, allow repeats in a new round. Skipped dates excluded from history. Persist with `ON CONFLICT DO NOTHING`; never recompute stored rows (idempotent).
- Endpoints (snake_case on the wire per repo convention):
  - Templates (admin/pastor via Roles): `GET/POST /life-group-task-templates`, `PATCH/DELETE /:id`, `PUT /reorder`.
  - `GET/PUT /life-groups/:id/task-members` (list group members with effective eligibility, reason, template exclusions, and whether eligibility is manual or auto-derived; PUT upserts per-member settings in bulk) and `GET/PUT /life-groups/:id/task-settings` (auto_exclude_inactive etc.). Access: admin + leader/co-leader via ScopeGuard + `assertCanAccess` co_leader fallback (same as attendance); reason notes are never returned by member-facing endpoints. Changing eligibility only affects future generation/reroll; existing assignments are untouched, but the panel offers 're-roll' for a now-ineligible assignee. Making a member ineligible after assignment shows a warning in the UI.
  - `GET/PUT /life-groups/:id/task-overrides`; `GET /life-groups/:id/tasks?date=`; `POST /life-groups/:id/tasks/generate` (idempotent), `POST .../reroll`, `PATCH .../tasks/:assignmentId` (manual reassign) — leader/co-leader/admin via ScopeGuard + co_leader_id fallback.
  - Member: `GET /me/life-group-tasks`, `GET /me/life-group-tasks/:id` (guide, only own assignment else 404/403), `POST /me/life-group-tasks/:id/decline` (auto re-roll excluding decliner, notify new assignee + leader, per OQ3).
- Scheduler: new `ReminderRuleType 'life_group_tasks'` + config `{ days_before_meeting: 3, hour: 9, include_leader: false, title, message }` in `reminders/types/reminder-config.ts` (+ DEFAULT_CONFIGS, seed/rule row per existing mechanism); `evaluators/life-group-tasks.evaluator.ts` modeled on the attendance evaluator: compute next meeting date in America/Sao_Paulo, fire when now == (meeting - N days) at hour, skip groups with null meeting day/"Sem dia fixo"/null time, generate (idempotent), notify only unnotified assignees, dedupe via `ReminderDispatchLog` key `life_group_tasks:{groupId}:{date}` (23505 tolerated) plus `notified_at`. Register in reminders module evaluator list. Per-assignee push: deepLink `paz://tarefa/{assignmentId}`, category `life_group_task`.
- Eligibility tests: ineligible never picked (engine, reroll, decline); per-template exclusion only blocks that template; auto-exclude by absences/joined date; explicit eligible=true overrides auto rule; all-ineligible -> unassigned + leader flag; no row = eligible; member-endpoint never leaks reason; ScopeGuard/co-leader authorization for task-members endpoints; fairness counts unaffected when someone is excluded then re-included.
- Edge cases to test: group with 0/1 members, members < tasks, leader without join-table row, template added/disabled after generation, inactive users, month/DST boundaries (Sao Paulo has no DST now but use zone math), concurrent evaluator runs (unique constraint), meeting weekday == today.

## Admin UI (`admin-ui/app/(dashboard)/`)
- `tarefas-life/` page: template table, reorder, active toggle, create/edit form with markdown guidance editor + preview.
- Life-groups page: "Tarefas" panel (per-group overrides, this meeting's assignments, re-roll / manual reassign).
- Group Tarefas panel also contains the member eligibility list: toggle per member, optional note, per-template exclusion multi-select, badge 'auto-excluded (inactive)', group-level auto-exclude switch + thresholds.
- Reminder-rule config UI entry for `life_group_tasks`; nav entry (role-gated); `lib/api` endpoints/types/hooks; Postman collection update per `.ai/apps/postman-files.md`.

## Mobile (kmp-mobile)
- shared: domain model `LifeGroupTask`, repository interface + Ktor impl, Koin in `SharedModule.kt` and `IosAppContainer.kt`, `LifeGroupTaskRepositoryTest` (model on attendance test).
- Android: `ui/features/lifegrouptasks` (guide screen, ViewModel, UiState; "Minhas tarefas" card on life group detail), `Screen.kt` route, `PushNotificationHelper.kt` `paz://tarefa/` + test, `AndroidModule.kt`.
- iOS: `Features/LifeGroupTasks` (view + view model), `DeepLinkDestination` case, `PushNotificationService.swift` + deep link views routing. Guidance rendered as markdown (shared renderer decision: use existing markdown rendering if present, else plain formatted text in v1 — Owen to confirm).

## API / data / auth impacts
New tables + migration (DB change: migration run in any env is a human gate). New JWT-protected endpoints; member endpoints scoped strictly to `req.user.id`. No secrets. New notification category requires Android/iOS client handling (older app versions fall back to default routing).

## Validation plan
- Backend: `npx jest src/life-group-tasks src/reminders src/life-group-attendance src/notifications`, `npm run build`, scoped `npx eslint <changed files>` (never unscoped `npm run lint`).
- Admin UI: lint + `npm run build` (per `.ai/commands.md`), manual check of pages.
- Mobile: `./gradlew :shared:allTests :android:testDebugUnitTest`, `:android:assembleDebug`; iOS build via Xcode/`xcodebuild` if available, else documented in test-results.
- Docs: update `.ai/features/{life-groups,notifications,mobile-app}.md`, `.ai/apps/*`, feature-map.

## Phases
B1 migration/entities/engine -> (B2 service/controllers || B3 evaluator/notifications) -> (A1 admin-ui || M1 shared) -> (M2 Android || M3 iOS) -> docs, Sattler, Malcolm, Arnold. Commits per phase on `feat/life-group-rotating-tasks`; PR to `develop` (merge = human gate).

## OPEN QUESTIONS (pipeline stopped here; recommended default in bold)
1. Timing: **generate + push 3 days before the meeting at 09:00 America/Sao_Paulo**, configurable via reminder rule (days_before_meeting, hour). Alternative: right after the previous meeting.
2. Pool: **co-leader participates, leader does not** (`include_leader` configurable per rule).
3. Decline: **members can decline -> auto re-roll excluding them + notify leader and new assignee.** Limit declines per member? (suggest none in v1).
4. Opt-out: **push not opt-outable** (omitted from CATEGORY_PREF_MAP, like forms/attendance).
5. Skipped meetings: **leader can skip a date; skipped dates do not count in fairness history** (requires skip table).
6. New members: **eligible immediately** (fairness uses count so they would be favored next round; confirm that is desired).
7. Completion: **no "done" confirmation in v1** (status `completed` column reserved but unused).
13. (New requirement) Mobile leader view to manage eligibility: **admin-ui only in v1** (leaders mostly use mobile, so confirm leaders without admin-ui access are OK, or add a mobile leader screen as a follow-up/extra phase M4).
14. Auto-exclude inactive: **off by default; N=4 recorded meetings absent; joined-days threshold 0**. There is no per-group join date in `user_life_groups`; may need a `joined_at` column (extra migration) or fall back to `users.membership_date`. Which do you prefer?
15. Should the excluded member be told? **No**; reason note is leader-only.
16. When no eligible member exists for a task: **leave unassigned + notify leader.** OK?
Additional questions raised by code review:
8. Which roles manage global templates: **admin + pastor** (the `LEADERSHIP_ROLES` set is broader — confirm).
9. Should leaders also be able to see/edit global template text, or only per-group guidance overrides? **Overrides only.**
10. Guidance format: **markdown**; confirm mobile may render basic markdown (bold, lists, links) vs plain text in v1.
11. Reminder if assignee has not opened the guide (e.g. day before)? **No, v1.**
12. Rollout: existing groups start generating on next evaluator tick after deploy; acceptable, or gate behind rule `is_active=false` until admin enables? **Ship the rule disabled by default.**
