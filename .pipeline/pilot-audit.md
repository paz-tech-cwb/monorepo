# Pilot readiness audit (2-3 life groups)

Scope: read-only code audit of `origin/develop` (branch `fix/pilot-readiness`, HEAD base c1eb2d4, includes PR #92). PR #93 (`origin/fix/supervisor-life-group-visibility`) is NOT merged; deltas are called out as "#93:".
Paths are relative to the repo root. Line numbers are from the working tree at audit time (other agents may be editing; re-check before quoting).

## 0. Executive summary

- Backend plumbing for the pilot exists and is reasonably unit-tested: life group CRUD, attendance, attendance push, rotating tasks, task push, studies, read-only weekly reports.
- Attendance, task and report-read endpoints authorize by leader_id/co_leader_id on the group, NOT by role slug, so a freshly attached leader with role `member` can take attendance, manage task eligibility and see "Presença"/"Elegibilidade"/"Relatórios" on the mobile group detail.
- Attaching a leader does NOT change the user's role. Everything role-gated (add members from mobile, edit group from mobile, Home "Relatórios de Grupos", Formularios catalog, publish study, admin-ui login) stays hidden/403 for a `member`-role leader. Admin must set role `life_group_leader` separately (admin-ui Users page, or `PATCH /users/:id/role`).
- Hard blockers are mostly DATA/ENV, not code: task templates are not seeded, task/study migrations are a human gate, `life_group_study` is missing from the DB enum migrations, FCM/APNs creds, groups must have `meeting_day` + `meeting_time`, roster must contain members.
- One real code defect still blocks the weekly report from mobile: payload does not match `CreateLifeGroupReportDto` on BOTH platforms and `userId` is sent as `life_group_id`.

## 1. Flow 1 - Admin creates life groups and attaches a leader

Status: WORKS (admin-ui), with sharp edges.

Backend
- `POST /life-groups`, `PUT /life-groups/:id`: `backend/src/life-groups/life-groups.controller.ts:40,71`, `@Roles(...LEADERSHIP_ROLES)` (admin, pastor, area_leader, sector_leader, life_group_leader; `common/constants/leadership-roles.ts`).
- DTO `life-groups/dto/create-life-group.dto.ts`: ONLY `name` is required. `leader_id`, `co_leader_id`, `sector_id`, `location`, `meeting_day`, `meeting_time`, `kids_count`, `image_url` are all optional/nullable. `meeting_day` is a free `@IsString` (no enum check), `meeting_time` free string cast to a Postgres `time` column (bad value => generic 400).
- No existence/role validation of leader/co-leader: `life-groups.service.ts:144-176` just sets `{id}`; a bad id fails on FK and is swallowed into `BadRequestException('An error occurred while creating the life group.')` (no field-level message). No check that leader != co-leader (admin-ui disables the same pick: `components/ministries/leader-pair-picker.tsx`).
- Attaching a leader does NOT touch the user's role (service has no role code). It also does NOT add the leader to `user_life_groups` (the roster). Consequences: the leader is absent from the attendance checklist and `member_count`; leader/co-leader are still auto-eligible for tasks (roster service unions them, `life-group-tasks/life-group-task-roster.service.ts:61-67`).
- Who assigns role `life_group_leader`: (a) admin only via `PATCH /users/:id/role` (`users/users.controller.ts:171-180`, `@Roles('admin')`) which admin-ui Users page calls (`admin-ui/app/(dashboard)/users/users-management.tsx:105-110`); (b) journey track `leader` has `promotes_to_role='life_group_leader'` (`database/migrations/1795700000001-AddJourneyTrackPromotesToRole.ts:16`, applied by `journey-tracks/journey-progress.service.ts:390-439`). Roles table seeded in `database/migrations/1695223456789-InsertRoles.ts`. New social-login users default to `guest` (`auth/auth.service.ts:195-209`).
- Geocoding of `location` calls Nominatim best-effort (`life-groups.service.ts:31-87`); failure never blocks save.

admin-ui (`admin-ui/app/(dashboard)/life-groups/life-groups-management.tsx`)
- Create/edit drawer: name required (line ~177 `if (!form.name.trim()) return`), day dropdown with "Sem dia fixo", `type="time"` input (line 659), leader/co-leader pickers fed by ALL users (`useUsers`, includes guests; `LeaderPairPicker leaderRequired` is false), sector select. After create the members dialog opens automatically (lines ~185-195) - good for the pilot flow.
- Nothing warns that leader role must be set separately, nor that `meeting_day`/`meeting_time` drive the push/task engines. Sector select has no "clear" option.
- Sidebar entry visible to LEADERSHIP_ROLES; admin-ui login itself is restricted to leadership roles (`auth/auth.service.ts:220-229`), so a `member`-role leader cannot use admin-ui at all.

Mobile gating inventory (what a `member`-role leader/co-leader sees)

| Gate | Check | member-role leader/co-leader |
|---|---|---|
| Group detail "Presença" and "Elegibilidade para tarefas" (`MinistryDetailScreen.kt:514,543`; ViewModel `MinistryDetailViewModel.kt:101-104`; iOS `MinistryDetailView.swift:194-197,373,399`) | `group.leaderId == me || group.coLeaderId == me` (id) | VISIBLE |
| Group detail "Relatórios"/"Relatórios semanais" (`canViewLifeGroupReports`, `MinistryDetailViewModel.kt:168-176`; iOS `:204-214`) | leader/co-leader id OR role admin/pastor/area/sector | VISIBLE |
| Home life-group card leadership flag (`shared/.../HomeLifeGroupCard.kt:52`) | id | VISIBLE (uses `GET /life-groups/me`) |
| Group detail "Gerenciar" (`canManage`, `MinistryDetailViewModel.kt:112`; iOS `:16-18,187-189`) -> edit group / add-remove members (`LifeGroupManageScreen.kt`) | `role.isLeader` (`User.kt:48-53`) | HIDDEN (and backend 403) |
| Home "Relatórios de Grupos" (`HomeViewModel.kt:80`, iOS `HomeViewModel.swift:65`) | `role.isLeader` | HIDDEN |
| Account screen leader items (`AccountScreen.kt:191,210,212`; iOS `AccountView.swift:122,146`) | `role.isLeader` | HIDDEN |
| Reports list (`ReportsListViewModel.kt:27`; iOS `ReportsListView.swift:12-27`) | `role.isLeader` | HIDDEN |
| Formularios (Casa de Paz lessons `FormDetailViewModel.kt:64-71`; catalog from backend `forms-catalog/forms-catalog.service.ts`) | role in catalog `write/read` lists | no leadership forms listed |
| Ministries create (`MinistriesView.swift:20`, `MinistriesViewModel.kt:52`) | `role.isLeader` | HIDDEN |
| Study publish button (`LifeGroupStudyListViewModel.kt:39`; iOS `LifeGroupStudyViewModels.swift:43`) | `role.isLeader` | HIDDEN |
| Study edit/delete (`LifeGroupStudyDetailViewModel.kt:38`) | publisher id == me or admin | n/a |

Backend @Roles/RolesGuard a new leader/co-leader hits

| Endpoint | Guard | `member`-role leader | `life_group_leader` |
|---|---|---|---|
| `GET /life-groups`, `/me`, `/:id` | JWT only | OK | OK |
| `POST/PUT/DELETE /life-groups`, `POST/DELETE /life-groups/:id/members/:userId` (`life-groups.controller.ts:40,71,81,88,98`) | LEADERSHIP_ROLES | 403 | OK for ANY group (no ownership check) |
| `GET /users`, `/users/lookup`, `/users/:id`, `PUT /users/:id`, `POST /users`, `/users/guests` (`users.controller.ts:59-169`) | LEADERSHIP_ROLES | 403 (mobile add-member search fails) | OK, all users |
| `/life-groups/:id/attendance*` (`life-group-attendance.controller.ts`) | JWT + ScopeGuard only; service fallback on leader/co-leader id (`life-group-attendance.service.ts:38-47`) | OK | OK |
| `/life-groups/:id/task-*`, `tasks`, `tasks/generate|reroll` (`life-group-tasks.controller.ts`) | JWT + ScopeGuard; fallback `life-group-task-access.ts:19-30` | OK | OK |
| `/me/life-group-tasks*` | JWT, own rows | OK | OK |
| `GET /forms/life-group-reports*` (read) | JWT + ScopeGuard; service unions leader/co-leader ids (PR #92) | OK | OK |
| `POST /forms/life-group-reports` (`life-group-reports.controller.ts:55-59`) | LEADERSHIP_ROLES | 403 | OK, but NO check the group is theirs (`life-group-reports.service.ts:110-146`) |
| `PATCH/DELETE /forms/life-group-reports/:id` | service-level rule | see service | see service |
| `/life-group-analytics/*` | JWT + ScopeGuard; ids unioned (`life-group-analytics.service.ts:49-79`) | OK | OK |
| `POST/PATCH/DELETE /life-group-studies` (`life-group-studies.controller.ts:73-140`) | LEADERSHIP_ROLES | 403 | OK |
| `GET /life-group-studies*` | JWT + `canView` | 403 unless rostered or co-leader | OK |
| `/life-group-studies/publishers*` | admin | 403 | 403 |
| `/life-group-task-templates*` | admin | 403 | 403 |
| `/reminder-rules` (`reminders.controller.ts:24,31`) | admin, pastor | 403 | 403 |
| `POST /users/device-tokens` | JWT | OK | OK |

Scope resolver (`forms-core/services/scope-resolver.service.ts:28-115`): on develop it keys off role slug (`life_group_leader` => FIRST led group only via `findOne`, line 95-107). A `member`-role leader gets an EMPTY scope; that is why every scope-based service adds the id fallback. A `life_group_leader` leading 2 groups only gets 1 in scope.
#93: resolver now derives scope from leader/co-leader rows regardless of role slug and unions all led groups (single CTE query); area/sector supervisors get their sectors' groups. `GET /life-groups/me` adds `relationship` (leader|co_leader|supervisor|member) and `is_supervised`; mobile `LifeGroup` model gains the fields (`Church.kt`). It does NOT change any `@Roles` guard, so the Gerenciar/Formularios/study-publish gaps remain.

Verdict / pilot action: create groups in admin-ui, set `meeting_day`+`meeting_time`, pick leader (+ co-leader), ALSO set leader role to `life_group_leader`, ALSO add leader/co-leader to the roster (members dialog) if you want them in attendance and study access.

## 2. Flow 2 - Leader starts the group with members

Status: WORKS only via admin-ui (or mobile Gerenciar for `life_group_leader`); there is NO self-join.

- Join paths: `POST /life-groups/:id/members/:userId` (LEADERSHIP_ROLES; `life-groups.service.ts:331-346`, idempotent) used by admin-ui "Gerenciar membros" and mobile `LifeGroupManageScreen` (`ChurchRepositoryImpl.kt:73`). Mobile discovery (`lifegroupdiscovery/`) is browse/map only, no join endpoint exists. Users must already exist (admin-ui create user, or they logged in once; social login creates `guest` users, `auth.service.ts:195-209`). Member-registration / forms are NOT required to be on a roster.
- `user_life_groups.joined_at timestamptz NOT NULL DEFAULT now()` (`database/migrations/1795900000004-CreateLifeGroupTasks.ts:149-152`); plain TypeORM many-to-many insert, so every join after the migration gets `now()`. Re-adding after removal resets it.
- Eligibility (`life-group-tasks/eligibility.ts`, roster SQL `life-group-task-roster.service.ts:81-95`): explicit setting wins; else leader/co-leader eligible; else member needs `>= min_present_meetings` (default 3, group-settable 0..52, `dto/life-group-task-config.dto.ts:83-86`) present=true attendance entries on/after joined_at (Sao Paulo calendar day). Grandfathering (`CreateLifeGroupTasks.ts:157-163`) applies ONLY to rows existing when that migration runs.
- Brand-new group with only new members: assignments are NOT empty; the pool = leader + co-leader (always eligible). With N templates and 1-2 eligible people, the engine hands everything to them (repeat rounds allowed once everyone has one) and pushes leader/co-leader for unassignable items (`life-group-task-assignments.service.ts:223-318`). New members get tasks only after 3 present records (3 meetings) or when the leader acts.
- What the leader sees (mobile "Elegibilidade para tarefas", `LifeGroupTaskMembersScreen.kt`, labels `LifeGroupTaskMembersUiState.kt:48-54`): "Pendente · x de 3 presenças", "Automático · ...", "Manual", "Liderança", "Membro antigo · participa"; slider/field "Presenças mínimas" (0..52), per-member eligible toggle, note, per-template exclusions. The leader CAN fix it: set min presences to 0 (or 1), or toggle individual members eligible. Mobile has NO "generate tasks now" button; manual generate is admin-ui only (Tarefas panel on the life group) or the evaluator.
- Is it a pilot blocker? No, but it is a surprise: with default settings the first 3 meetings only leaders get tasks. Recommended pilot setup: leader sets `min_present_meetings` = 0 or 1, or marks pilot members eligible. Order-of-operations note: if the production migration (1795900000004) has not run yet, adding the pilot members BEFORE running it grandfathers them (eligible immediately); after, they follow the 3-presence rule. Migrations are a human gate (`.ai/features/life-groups.md`, `feature-map.md`).
- Gaps: leader/co-leader not auto-added to roster (see Flow 1); roster-only `members_count`; a member removed leaves their `life_group_task_member_settings` row (harmless).

## 3. Flow 3 - Attendance push to leader/co-leader

Status: WORKS in code and unit tests; depends on data + env.

- Rule seeded ENABLED: `database/migrations/1795000000000-CreateLifeGroupAttendance.ts:44-49`, `{"hours_after_meeting_start":2,"title":"Lançar presença do Life Group","message":"..."}`. Enum value added in `1794900000000-AddLifeGroupAttendanceEnumValues.ts`. Scheduler `@Cron(EVERY_HOUR)` (`reminders/reminder-scheduler.service.ts:19`), `ScheduleModule.forRoot()` in `app.module.ts:54`, evaluator registered in `reminders.module.ts:37-53`.
- Evaluator `reminders/evaluators/life-group-attendance-reminder.evaluator.ts`: groups need `meetingDay` AND `meetingTime` non-null (l.48-50) and a day in `WEEKDAY_INDEX` ("Sem dia fixo" skipped, l.58-64). Hour math uses only the HOUR of `meeting_time` (l.66-80): meeting 19:30 => fires 21:00 (1.5 h after), crosses midnight correctly (weekday + dateKey shift, l.85). Timezone fixed to `America/Sao_Paulo` (`life-group-attendance/meeting-day.util.ts`). Skips if attendance for that date already exists (l.88). Recipients: `leader` + `coLeader` (l.99-102); deep link `paz://presenca/{groupId}/{date}`; category `life_group_attendance`, channel `paz_life_group`, push only.
- Defects / risks:
  - Dedupe row is inserted AFTER dispatch regardless of delivery result (l.119-129): if the leader has no device token or FCM fails, there is no retry and the reminder is lost for that meeting. Also a missed hourly tick (deploy/restart at minute 0) has no catch-up.
  - Doc says attendance push cannot be opted out (`.ai/features/notifications.md`), but `NotificationDispatchService` still honors `allNotificationsEnabled` and `pushEnabled` (`notifications/notification-dispatch.service.ts:71,78`); only the per-category flag is bypassed.
  - admin-ui reminder settings do not know this rule type: `admin-ui/lib/api/types/reminder-rules.ts:3` union lacks `life_group_attendance`; `RULE_TITLES`/`RULE_DESCRIPTIONS` (`reminder-settings.tsx:60-71`) have no entry and no controls (`:259-` only for tasks/form/event/journey). The rule can be toggled but not tuned (hours/title/message) from admin-ui; its title likely renders blank. Backend `validateReminderConfig` supports it.
  - Reminder rules endpoint admin/pastor only.
- Device tokens: mobile registers `POST /users/device-tokens` (`UserRepositoryImpl.kt:55`; Android `PushNotificationHelper.kt:22`, `PazFirebaseMessagingService.kt:25-28`, POST_NOTIFICATIONS requested in `MainActivity.kt:41,82`; iOS `PushNotificationService.swift:54,121`). Deep links parsed on both (`PushNotificationHelper.kt:88-99`, `DeepLinkDestination.swift:47-53`). Android channels exist incl. `paz_life_group` (`PazFirebaseMessagingService.kt:88-95`) and `ensureChannels()` is called from `PazApplication.onCreate()`.
- FCM: `notifications/providers/fcm.service.ts:12-21` initializes firebase-admin from `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (also used by `auth/auth.service.ts:87-89`). No APNs block in the send payload; iOS delivery relies on the APNs key uploaded to the Firebase project.
- Editor flow: history FAB "Lançar presença" -> editor; `GET /life-groups/:id/attendance/:date` returns a draft from the CURRENT ROSTER with everyone `present=true` (`life-group-attendance.service.ts:~160-190`); new record only on the group's `meeting_day` (`assertMatchesMeetingDay`, l.62-75) and not future by UTC date (l.51-58); first save requires >=1 entry and all ids on the roster (l.~222-250). Empty roster => cannot record attendance at all.
- Pilot needs: `meeting_day` (a real weekday) + `meeting_time` on each group; leader/co-leader users with a registered device token; rule enabled (default yes); roster populated.

## 4. Flow 4 - Estudo do Life

Status: partially working; push likely broken on a migration-built DB; publisher grants non-functional.

- Create: `POST /life-group-studies` guarded by `@Roles(...LEADERSHIP_ROLES)` (`life-group-studies.controller.ts:73-76`), then `canPublish` (`life-group-study-access.service.ts:26-45`) which ALSO allows any co-leader and anyone in `life_group_study_publishers`. Those extras are unreachable because the controller guard returns 403 first for `member`-role users. Leader_id with role member is not covered by `canPublish` at all (only co-leader). Admin grants "writers" via admin-ui `estudo-do-life/publicadores` (admin only) - dead for plain members for that reason (the admin-ui comment `lib/permissions/life-group-studies.ts:25-40` assumes grant holders work).
- Edit/delete only publisher or admin (`life-group-studies.service.ts:~205-213`). Publish = create (no draft state/scheduling).
- Push on publish EXISTS: `notifyLeadership` (`life-group-studies.service.ts:216-247`), category `life_group_study`, deep link `paz://estudo-do-life/{id}`, channel `paz_life_group_study`. Recipients: every user with a leadership role (all admins, pastors, area/sector/life group leaders church-wide) plus all co-leaders. Ordinary members and `member`-role leader_id leaders are NOT notified. Failures are only logged (`:69-79`).
- Likely defect: no migration adds `life_group_study` to `notification_category_enum` (grep of `database/migrations`: absent; present: `life_group_attendance`, `life_group_task`). On a DB built from migrations the notification INSERT fails and the push never goes out (study still saves). Verify against the real DB enum; fix is a one-line `ALTER TYPE ... ADD VALUE IF NOT EXISTS` migration (outside a transaction like 1795900000003).
- Read: `canView` = canPublish OR rostered in any group (`life-group-study-access.service.ts:52-61`); non-rostered gets 403 "must belong to a life group". So a leader_id leader with role member who was not added to the roster cannot read studies. Mobile list/detail/deep link exist (`lifegroupstudy/`, iOS `LifeGroupStudy/`).
- admin-ui: `/estudo-do-life` list/new/edit/publishers, sidebar LEADERSHIP_ROLES (`components/sidebar.tsx:90`).

## 5. Flow 5 - Random task assignment (high level)

Status: implemented end to end; blocked on setup.

- Templates are admin-only and NOT seeded (no INSERT into `life_group_task_templates` in `1795900000004`): with zero active templates nothing is ever generated. Admin must create templates in admin-ui "Tarefas do Life" (sidebar admin only, `components/sidebar.tsx:91`).
- Rule `life_group_tasks` seeded enabled, `days_before_meeting [3,1]`, hour 9 (`1795900000004:168-171`); admin-ui can edit it (`reminder-settings.tsx:215-261`). Evaluator `reminders/evaluators/life-group-tasks.evaluator.ts`: runs only when church-local hour == `hour` (l.64); largest offset generates + pushes assignees, smaller offsets remind (l.141-211); claim-first dedupe + release on failure.
- Timing trap: generation happens only on D-3 at 09:00. A group (or leader) set up less than 3 days before its next meeting, or after 09:00 on D-3, gets nothing automatically; use admin-ui "Tarefas" panel -> generate (`POST /life-groups/:id/tasks/generate`, window -7d/+60d, must match meeting day) which pushes new assignees immediately.
- Decline/reroll/leader pushes and no-eligible leader push: `life-group-task-notifications.service.ts`, `life-group-task-assignments.service.ts:605-705`; member endpoints `/me/life-group-tasks`; mobile guide screen + deep link `paz://tarefa/{id}`.
- Interplay with new members: see Flow 2. Assignment never errors on an empty pool; unassignable templates push the leader instead.
- Not applied yet: migrations 1795900000003/4 (human gate per docs). Without them the module's tables and enum values do not exist.

## 6. Flow 6 - Weekly life group report

Status: READ works (PR #92); WRITE from mobile is BROKEN on both platforms; WRITE from admin-ui works for leadership roles.

- Mobile submit sends `LifeGroupReportForm{life_group_id:String, date, attendees, visitors, offerings, observations}` (`kmp-mobile/shared/.../domain/model/Form.kt:248-255`) with `lifeGroupId = userId` (Android `FormDetailViewModel.kt:367-376`; iOS `FormDetailView.swift:390-396`), to `POST api/forms/life-group-reports` (`FormsRepositoryImpl.kt:114-115`). Backend `CreateLifeGroupReportDto` (`life-group-reports/dto/create-life-group-report.dto.ts`) requires `area_id`, `sector_id`, `life_group_id` (int), `committed_members`, `committed_members_present`, `kids_0_to_11`, `guests`, `mdas`, `offering` (numeric string), `committed_at_tadel/culto`, `leader_attended[]`, `disciples_count`, `disciples_discipled_this_week`, `pastoring_activity_type[]`, `training_activity_type[]`; global ValidationPipe `forbidNonWhitelisted` => 400. Even if accepted, the group id would be the user's id. Confirmed unchanged on develop.
- Create `@Roles('admin','pastor','area_leader','sector_leader','life_group_leader')` (`life-group-reports.controller.ts:55-59`): co-leaders and `member`-role leaders get 403 and the form is absent from their catalog. Create also does not verify the actor may report for `dto.lifeGroupId/areaId/sectorId` (`life-group-reports.service.ts:110-146`).
- Read (#92): `GET /forms/life-group-reports?life_group_id=`, `/:id`, `/:id/audit`; visible groups = scope UNION groups where viewer is leader/co-leader; others 403/404. Mobile list/detail screens exist (`lifegroupreports/`, `LifeGroupReportRepositoryImpl.kt`). A leader today can READ past reports for their group (including ones entered via admin-ui) and cannot submit one from the phone.
- Reminder `form_report` (weekly "Relatório de Life Group pendente", Sunday 20:00, role `life_group_leader`) is seeded DISABLED (`1780900000002-CreateReminderRules.ts:22`); enabling it would push leaders to a form that fails on mobile.
- Pilot options: (a) fix the mobile payload (form with the 17 backend fields; resolve ids from the selected group: `life_group_id`, `sector_id`, area via sector), loosen create guard to allow leader/co-leader of the group, or (b) have leaders submit via admin-ui and keep the `form_report` reminder disabled.

## 7. Roles / permissions summary for the pilot

| Capability | admin | pastor | area/sector leader | life_group_leader (own group) | member-role leader/co-leader | member |
|---|---|---|---|---|---|---|
| admin-ui login | yes | yes | yes | yes | NO | NO |
| Create/edit group, set leader/day/time | yes | yes | yes | yes (any group) | no | no |
| Set user role | yes | no | no | no | no | no |
| Add/remove roster members | yes | yes | yes | yes (any group) | no | no |
| Record attendance (own group) | yes | yes | in scope (develop: only if role slug matches rows) | yes | yes (id fallback) | no |
| Task eligibility / generate / reroll (own group) | yes | yes | in scope | yes | yes | no |
| Receive attendance push | if leader | if leader | if leader | yes | yes | no |
| Receive/decline own task | yes | yes | yes | yes | yes | yes (if eligible) |
| Task templates, publishers, reminder rules | templates/publishers yes, rules yes | rules yes | no | no | no | no |
| Publish study | yes | yes | yes | yes | no (even co-leader, controller guard) | no |
| Read studies | yes | yes | yes | yes | only if rostered/co-leader | only if rostered |
| Submit weekly report (backend) | yes | yes | yes | yes (any group) | no | no |
| Read weekly reports (own group) | yes | yes | in scope | yes | yes | no |

## 8. Test coverage gaps (per flow)

- No integration/e2e tests at all (`backend/test` absent; admin-ui has no test files). All raw SQL is unverified against Postgres: roster presence query with `AT TIME ZONE` (`life-group-task-roster.service.ts:81-95`), #93 scope CTE, `findMine` joins, `joined_at` default.
- Flow 1: `life-groups.service.spec.ts` (12 cases) - no controller test for guards/DTO; no test for member-role leader end-to-end; no admin-ui tests.
- Flow 2: roster/eligibility have unit specs (`life-group-task-roster.service.spec.ts`, `eligibility.spec.ts`); no test of `addMember` => `joined_at` default or of the grandfather migration; no mobile test for the eligibility screen flow with min=0.
- Flow 3: evaluator spec exists (`life-group-attendance-reminder.evaluator.spec.ts`), attendance service spec (20 cases), `meeting-day.util.spec.ts`; no controller spec, no test for undelivered push + dedupe, no admin-ui coverage of the attendance rule, no FCM/device-token integration test.
- Flow 4: service/access/controller specs exist; nothing exercises the DB enum (`life_group_study`), nor co-leader/grant publish through the real `@Roles` guard.
- Flow 5: engine, assignments, notifications, config, templates specs and `life-group-tasks.evaluator.spec.ts`; no test with only-new-members group, no test for "group created inside D-3".
- Flow 6: service/controller specs (28 cases) and mobile `LifeGroupReportsTests.swift`/Android lifegroupreports tests for READ; the mobile SUBMIT payload has no contract test against the backend DTO (that is how it drifted).
- Mobile: gating helper tests exist (`LifeGroupDetailViewModelTest.kt`, iOS tests) but nothing asserts the Gerenciar/Home/Account role gates for `member`-role leaders.

## 9. Environment / config prerequisites (checklist)

- [ ] Run pending migrations in prod (1795900000003 enum values, 1795900000004 tasks tables + `joined_at` + grandfather + `life_group_tasks` rule) - human gate; run BEFORE or AFTER adding pilot members deliberately (see Flow 2).
- [ ] Add migration/DB fix for `notification_category_enum` value `life_group_study` (or confirm it exists in prod) if study push is in scope.
- [ ] `reminder_rules`: confirm `life_group_attendance` enabled (seeded true), `life_group_tasks` enabled (seeded true), `form_report` stays disabled until mobile submit is fixed (admin-ui Notificações > lembretes; attendance rule cannot be edited there).
- [ ] Backend env: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (newline-escaped), `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `GOOGLE_CLIENT_ID`, DB vars, `DB_SYNCHRONIZE=false` (`.ai/features/deployment.md:46-48`); SMTP/SMS/WhatsApp not needed (push-only rules).
- [ ] Firebase project: Android app registered (google-services), iOS app registered + APNs auth key (.p8) uploaded; iOS push entitlement + provisioning in the build; notification permission accepted on each pilot phone; app opened at least once after login so the token is registered.
- [ ] Server timezone does not matter (church TZ hard-coded America/Sao_Paulo) but exactly ONE scheduler instance or multi-instance claims (tasks have claim-first; attendance evaluator does not claim before sending, so run a single instance).
- [ ] Outbound HTTPS to nominatim.openstreetmap.org (geocoding; optional).
- [ ] Mobile builds contain PR #92 (home cards, reports read) and, if wanted, #93.

## 10. Pilot data-setup checklist

1. Make sure every pilot person (leaders, co-leaders, ~5-10 members per group) has logged in once, or create them in admin-ui Users.
2. admin-ui Users: set leaders' role to `life_group_leader`; leave co-leaders as `member` unless they need Gerenciar/study publishing (then also `life_group_leader`).
3. (Optional) a sector in admin-ui Organização so groups have `sector_id` (area/sector reports and supervisor visibility depend on it).
4. admin-ui Life Groups: create 2-3 groups with name, location, REAL weekday (not "Sem dia fixo"), time, leader, co-leader, sector.
5. In the auto-opened members dialog add every member AND the leader/co-leader (so they appear in attendance and can read studies).
6. admin-ui Tarefas do Life (admin): create >=3-5 active task templates with guidance.
7. Per group on mobile (leader): "Elegibilidade para tarefas": set "Presenças mínimas" to 0 or 1 (or mark members eligible); otherwise only leader/co-leader receive tasks for the first 3 meetings.
8. If a group's next meeting is < 3 days away (or after 09:00 on D-3): admin-ui group > Tarefas > generate manually.
9. Verify push: in admin-ui send a test notification to a leader; confirm device token row exists for each leader.
10. Do a dry run attendance: Android/iOS leader opens group > Presença > Lançar presença on the meeting weekday.
11. Weekly report: either fix mobile submit first or have leaders use admin-ui form; keep `form_report` reminder off meanwhile.
12. Publish a test study as admin; check the push arrives for leaders and decide how rostered members will learn about it (they are not pushed).

## 11. Prioritized blockers

P0 (must resolve before pilot starts)
1. Migrations 1795900000003/4 not run (human gate): tasks tables/enum/`joined_at`/rule absent. `database/migrations/1795900000003-*.ts`, `1795900000004-*.ts`.
2. Leader role is not set by attaching a leader: set `life_group_leader` manually (Flow 1); otherwise no Gerenciar, no Home/Account/Reports entries, no weekly-report form, no study publishing, no admin-ui access.
3. `meeting_day` (real weekday) + `meeting_time` required per group or attendance/task pushes skip silently (`life-group-attendance-reminder.evaluator.ts:48-64`, `life-group-tasks.evaluator.ts:66-80`); admin-ui does not enforce or warn.
4. Roster must contain members (and ideally leaders): empty roster => attendance cannot be saved (`life-group-attendance.service.ts` "At least one entry"), tasks go only to leaders.
5. FCM/APNs credentials and device-token registration (environment) - no push without them.
6. Task templates must be created (none seeded) or the feature produces nothing.

P1 (fix or consciously accept)
7. Mobile weekly report submit is broken on Android and iOS (payload mismatch + userId as lifeGroupId): `Form.kt:248-255`, `FormDetailViewModel.kt:367-376`, `FormDetailView.swift:390-396`; create guard excludes co-leaders (`life-group-reports.controller.ts:55-59`).
8. `life_group_study` missing from DB enum migrations => publish push fails silently (`life-group-studies.service.ts:216-247`).
9. Task engine only generates at D-3 09:00; late setup needs manual generate (admin-ui only; no mobile button).
10. Attendance push dedupe row written even when delivery failed/no token (`life-group-attendance-reminder.evaluator.ts:119-129`) - one missed push per meeting is permanent.
11. New members (default 3-presence rule) get no tasks for 3 meetings; leader-only task load in a new group (mitigate via min presences 0).

P2 (acceptable for a trusted-leader pilot; track)
12. admin-ui cannot display/edit the `life_group_attendance` rule (`reminder-rules.ts:3`, `reminder-settings.tsx:60-71`).
13. Notification user prefs (`allNotificationsEnabled`, `pushEnabled`) still suppress "non-opt-outable" attendance/task pushes (`notification-dispatch.service.ts:71,78`) - docs wrong.
14. Authorization looseness: any `life_group_leader` can edit/delete any group, change any roster, list/update any user, and submit a report for any group (`life-groups.controller.ts:71-98`, `users.controller.ts:68-169`, `life-group-reports.service.ts:110-146`).
15. Study publisher grants and co-leader publishing blocked by controller `@Roles` (`life-group-studies.controller.ts:73-140`); leader_id (non co-leader) with role member cannot read studies unless rostered; members are never pushed about new studies.
16. Generic "An error occurred..." errors for bad leader/time values (`life-groups.service.ts:171-175,318-323`); no leader != co-leader validation.
17. Develop scope resolver gives a `life_group_leader` only ONE led group and ignores member-role leaders (id fallbacks cover attendance/tasks/reports/analytics). #93 fixes the resolver and adds `relationship`; merge it if any leader leads 2 groups or area/sector supervisors will see groups in the pilot.
18. No integration tests / no admin-ui tests (Section 8).

## 12. Where PR #93 changes the answer

- Scope resolver (`scope-resolver.service.ts`, develop 28-115): role-slug dependent and single-group => #93 role-independent, multi-group, includes area/sector supervision. Affects: member-registrations scope filter, casa-de-paz, analytics, life-group-reports visible set, ScopeGuard consumers. Does not change attendance/task access for leader/co-leader (already id-based).
- `GET /life-groups/me`: adds supervisor rows + `relationship`/`is_supervised` (omits rosters for supervisor-only rows); `GET /life-groups/:id` marks supervised viewers as allowed to see members. Mobile `LifeGroup` gets two new fields (no UI change in the diff).
- Unchanged by #93: leader role not auto-set, all `@Roles` guards, mobile role gates, weekly-report payload bug, study/enum issue, reminder behavior.
