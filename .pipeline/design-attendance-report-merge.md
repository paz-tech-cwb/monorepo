# Design: merge Presença and Relatório into one "Reunião" flow

Status: design only (no code). Branch context: fix/pilot-readiness. Facts below were read from the code on this branch; items marked (unverified) were not opened.

## 1. TL;DR recommendation

Build ONE combined screen ("Reunião do Life Group") reached from ONE push, backed by ONE new transactional endpoint, but keep the two tables and the two existing endpoints. Make the flow **two-stage on a single screen**:

1. Section A "Presença" (roster checklist) — the quick part, saveable on its own.
2. Section B "Relatório" (offering, kids, guests, MDAs, discipleship, activities...) — saveable later, same screen, same record key.

Single source of truth: attendance entries drive `committed_members_present` (and `committed_members` by default); the server derives them, the client never types them twice. The reminder becomes one rule: one push at meeting start + N hours; an optional single follow-up only if the report half is still missing. Deprecate the `life-group-reports` entry of `form_report`.

Why not a hard "one form, one submit": see section 3 (it delays attendance data that task eligibility depends on, and leaders often lack the offering/discipleship numbers at meeting end).

## 2. What exists today (facts)

### Attendance (backend/src/life-group-attendance)
- Tables: `life_group_attendance` (uuid id, life_group_id, meeting_date date, present_count, members_count, recorded_by, timestamps; UNIQUE (life_group_id, meeting_date)) and `life_group_attendance_entries` (attendance_id, user_id, present; UNIQUE (attendance_id, user_id)). Roster snapshot taken on first save; later edits only flip `present`.
- API: `GET /life-groups/:id/attendance`, `GET .../:date` (saved or draft from current roster, `is_draft`), `PUT .../:date` `{entries:[{user_id,present}]}` (min 1, no duplicates, unknown users rejected on first save, date not in the future, weekday must match `meeting_day` only on first create). Concurrent double submit retries once on 23505.
- Auth: no @Roles; `assertCanAccess` = unrestricted scope OR group in scope OR `coLeader.id` OR `leader.id`. No edit window (editable forever). Audit slug `life_group_attendance`.
- Consumers: life-group-analytics (`attendanceByMonth/ByMeeting` sum present_count/members_count), life-group-tasks eligibility (>= `min_present_meetings` present entries since `joined_at`), reminder evaluator, mobile history + editor (Android `lifegroupattendance/`, iOS `Features/LifeGroupAttendance`), entry point = "Presença" card in `MinistryDetailScreen.kt` (~L515-535, shown when `canManageAttendance`) and `MinistryDetailView.swift` (~L375-385).

### Report (backend/src/life-group-reports)
Table `life_group_reports` (uuid id, soft delete, `submittedBy` FK, audit slug `life-group-reports`). NO unique constraint on (life_group_id, date): duplicates are possible today.
API: list/get/audit are scope-aware plus leader/co-leader fallback (recent fix). `POST` has `@Roles('admin','pastor','area_leader','sector_leader','life_group_leader')` so a co-leader with role `member` gets 403; `create()` does NOT check that the actor may act for `dto.lifeGroupId` (any life_group_leader can post for any group id) and trusts client `area_id`/`sector_id`. `PATCH :id` has no scope check, relies on `FormSubmissionPolicyService`: admin always; submitter only within 24h from createdAt. Delete admin only.

### Exact CreateLifeGroupReportDto (UpdateLifeGroupReportDto = PartialType of it)
All wire names snake_case via @Expose. The global pipe uses excludeExtraneousValues, so only listed names pass.

| Wire field | Type / validator | Required | DB column | Mapping to attendance |
|---|---|---|---|---|
| `date` | IsDateString | yes | date | = meeting_date of the combined record (today free-form; attendance is weekday-checked) |
| `area_id` | IsInt | yes | int | derive server-side from group.sector.area; drop from combined payload |
| `sector_id` | IsInt | yes | int | derive from group.sector |
| `life_group_id` | IsInt | yes | int | = path param of the combined endpoint |
| `committed_members` | IsInt (no @Min) | yes | int | DERIVED default: `members_count` (roster snapshot). Open question Q1: "comprometidos" may be a subset of roster |
| `committed_members_present` | IsInt | yes | int | DERIVED: `present_count` (leader/co-leader counted if they are roster entries; see Q2) |
| `kids_0_to_11` | IsInt | yes | int | SEPARATE input (children present that week; not the group's static `kids_count`) |
| `guests` | IsInt | yes | int | SEPARATE input (could later link to form-guests; out of scope) |
| `mdas` | IsInt | yes | int | SEPARATE input |
| `offering` | IsNumberString | yes | numeric(10,2) default 0 | SEPARATE input (decimal string) |
| `committed_at_tadel` | IsInt | yes | int | SEPARATE input (not an attendance concept) |
| `committed_at_culto` | IsInt | yes | int | SEPARATE input |
| `leader_attended` | IsArray of IsString | yes | text[] default '{}' | SEPARATE multi-select (values free strings today, e.g. "tadel","culto"; no enum). NOT the same as the leader's presence at the group meeting |
| `disciples_count` | IsInt | yes | int | SEPARATE input |
| `disciples_discipled_this_week` | IsInt | yes | int | SEPARATE input |
| `pastoring_activity_type` | IsArray of IsString | yes (array may be empty) | text[] | SEPARATE multi-select (free strings, e.g. "visita") |
| `pastoring_activity_other` | IsOptional IsString | no | varchar(180) null | SEPARATE |
| `training_activity_type` | IsArray of IsString | yes (array may be empty) | text[] | SEPARATE multi-select |
| `training_activity_other` | IsOptional IsString | no | varchar(180) null | SEPARATE |

Only 3 report fields overlap attendance conceptually (committed_members, committed_members_present, date). Everything else is not derivable from attendance.

Known bugs in current clients (confirms the form is broken today):
- Mobile (Android `FormDetailViewModel.kt` ~L367, shared `LifeGroupReportForm` in `Form.kt` ~L248): sends `{life_group_id = userId, date, attendees, visitors, offerings, observations}`: none of attendees/visitors/offerings/observations exist in the DTO, and `life_group_id` is the user id, no picker. With excludeExtraneousValues this 400s (or writes wrong group). iOS uses `lgPicker` in FormFieldDefs.swift (unverified payload).
- Admin-ui form (`admin-ui/app/(dashboard)/formularios/life-group-reports/new/life-group-reports-form.tsx`) sends `pastoring_activity_type`/`training_activity_type` as a single string (DTO wants string[]), omits `leader_attended` and both `*_other`; `admin-ui/lib/api/types/formularios.ts` types them as `string`. So the report has effectively been unsubmittable from both clients; existing rows (if any) are likely few or hand/Casa-de-Paz-sourced. CHECK PROD ROW COUNT before designing backfill (Q9).
- Mobile read side (LifeGroupReportRepositoryImpl) already tolerates string-or-array for the multi-valued fields.

### Reminders
- `life_group_attendance` (LifeGroupAttendanceReminderEvaluator): hourly, Sao Paulo zoned (`zonedParts`), fires `hours_after_meeting_start` (default 2) after meeting start, handles midnight rollover; skips groups without `meeting_day`/`meeting_time`; skips if attendance already recorded; recipients leader + co-leader; deep link `paz://presenca/{lgId}/{date}`; category `life_group_attendance` (not opt-outable, channel paz_life_group); dedupe `life_group_attendance:{gid}:{date}` in `ReminderDispatchLog`. It checks dedupe then sends then inserts the log (NOT claim-first, so two instances can double-send; the tasks evaluator is claim-first). Not editable in admin-ui `reminder-settings.tsx` (RULE_TITLES lacks it).
- `form_report` (FormReportReminderEvaluator): per entry weekday/hour using SERVER-LOCAL `now.getDay()/getHours()` (not Sao Paulo), dedupe `form_report:{slug}:{YYYY-MM-DD}`, claim-first, sends to EVERY user with role in `roles` (default `life_group_leader`, Sunday 20h) regardless of whether they already submitted, nor co-leaders; deep link `paz://form/{slug}`; category `forms`. Default entry for life-group-reports in `reminder-config.ts` DEFAULT_CONFIGS (seeded rows in `reminder_rules` are DB data: migration `1780900000004-UpdateFormReportReminderConfig` shows how it was updated before).

### Deep links
- `paz://presenca/{lifeGroupId}/{date}` parsed in Android `PushNotificationHelper.kt` (~L66) and iOS `DeepLinkDestination.swift` (~L47) (+ `DeepLinkViews.swift`, tests `DeepLinkDestinationTests.swift`, `PushNotificationHelperTest.kt`). `paz://form/{slug}` and `paz://formularios` also exist.

### Catalog / admin-ui
- Catalog `forms-catalog.service.ts`: slug `life-group-reports` "Relatório de Life Group", write/read roles admin, pastor, area_leader, sector_leader, life_group_leader (co-leader-as-member invisible).
- Admin-ui: generic `/formularios/[slug]` list (`_columns.tsx`, `page.tsx`) and `/formularios/life-group-reports/new`; analytics components `components/life-group-analytics/life-group-attendance-chart.tsx`; `life-groups-management.tsx` mentions attendance. There is NO admin attendance list/detail screen (verified by grep) beyond the chart.

## 3. Challenging the idea

What the user gets right: two pushes for one meeting is noise; the report's `committed_members_present` duplicates attendance (double entry, divergent numbers); the report path is broken and under-authorized; one place to edit is simpler.

Where a naive merge would hurt:
1. Different cadence/urgency. Attendance is captured at the meeting (push at start+2h) and gates task eligibility (rotation). The report is weekly (Sunday 20h reminder) and needs numbers (offering, discipleship, activities) a leader often has later. A single all-or-nothing submit either delays attendance for days (breaking task eligibility and the "present" analytics) or pushes leaders to fill junk report values at 22h. => two save points.
2. Different keys. Attendance is strictly (group, meeting date on `meeting_day`); the report `date` is free and can be a Sunday summary of a Wednesday meeting; groups with "Sem dia fixo" cannot be attendance-keyed at all. => keep the generic report path alive for those, and for admins/area/sector.
3. Different edit policies: attendance unlimited, report 24h submitter/admin. A merged record needs ONE policy (Q5).
4. Merging tables is high risk/low value: analytics, task eligibility and entries snapshot all depend on the attendance schema; reports have soft delete + audit slug + admin-ui forms. A join by (life_group_id, date) is enough.
5. A report is also sector/area-supervisor input in the hierarchy; keep report read access unchanged.

Conclusion: merge the experience and the trigger, not the storage. "One form" = one screen, one deep link, one reminder, one write endpoint; two persisted halves, sequential completeness states.

## 4. Options compared

| Option | Description | Pro | Con | Verdict |
|---|---|---|---|---|
| A. Single combined screen, two save points, server-derived overlap (RECOMMENDED) | Scrollable screen: Presença then Relatório; "Salvar presença" and "Enviar relatório"; one endpoint | Quick capture preserved; no double entry; one push; incremental rollout | New endpoint + new screen on 2 platforms | Recommended |
| B. Wizard (step 1 attendance, step 2 report) | Same as A but forced sequence | Familiar on mobile; lets attendance be committed at step 1 | More navigation state, harder to edit later (which step?), no overview of the record; Android has an existing step form (FormStepScreen) but the attendance editor is a roster list not a step | Use only if design prefers; same backend as A |
| C. One mega-form, single submit | Everything required at once | Simplest model | Delays attendance; fails when offering unknown; harsh on offline | Reject |
| D. Keep separate, fix the report only | Fix report payload + auth, dedupe the push | Smallest change | Does not meet the goal (two pushes, double entry) | Fallback = Phase 0 anyway |
| E. Merge tables into one `life_group_meetings` | One row per meeting | Clean model | Breaks analytics/tasks/entries, big migration | Reject (revisit later) |

A and B share backend; screen layout is a UX choice. Recommend A (sections, sticky save bar, progress chips "Presença salva" / "Relatório pendente").

## 5. Recommended design (A)

### 5.1 Data model (no table merge)
- Keep `life_group_attendance` + entries untouched.
- `life_group_reports`: add nullable `attendance_id uuid` FK -> life_group_attendance(id) ON DELETE SET NULL (links the halves, enables fast joins), and a PARTIAL UNIQUE index `(life_group_id, date) WHERE deleted_at IS NULL` (one active report per group+date). Migration must first detect duplicates (query, report to humans; do not auto-delete). `date` for combined records = meeting_date.
- Keep `committed_members` / `committed_members_present` columns (admin-ui, exports, mobile read model rely on them) but, for combined records, they are SNAPSHOTS written by the server from attendance in the same transaction and re-synced on every attendance edit. Never accepted from the client on the combined endpoint.
- Make report numeric fields effectively optional while the report half is "in progress"? Not needed: the report half is created only when the leader submits Section B (all required fields), so no nullable column churn. Section B draft lives on device (5.5).
- Add `status` derived, not stored: `attendance_saved = attendance row exists`, `report_submitted = report row exists`. (Avoids state drift.)

### 5.2 API
New (scope-based, same `assertCanAccess` as attendance; no @Roles, so co-leaders with role `member` work):
- `GET /api/life-groups/:id/meetings/:date` -> `{ meeting_date, attendance:{...same as today incl. is_draft}, report: {...toResponse}|null, derived:{committed_members, committed_members_present}, can_edit_attendance, can_edit_report, report_editable_until }`.
- `PUT /api/life-groups/:id/meetings/:date` body `{ attendance?: {entries:[{user_id,present}]}, report?: {kids_0_to_11, guests, mdas, offering, committed_at_tadel, committed_at_culto, leader_attended[], disciples_count, disciples_discipled_this_week, pastoring_activity_type[], pastoring_activity_other?, training_activity_type[], training_activity_other?}, client_request_id?: uuid }`. At least one of the two. One DB transaction: upsert attendance (reuse extracted service function from `LifeGroupAttendanceService.upsert`), upsert report (create if none else update), derive overlap fields, set `submittedBy`/`attendance_id`, write audit rows for both slugs. If only `report` is sent and no attendance exists yet: 409 `attendance_required` (report derives from attendance), unless the group has no roster (then 400).
- Idempotency: PUT on (group,date) is naturally idempotent; the existing 23505 retry-as-update is kept for both unique constraints. `client_request_id` optional, stored nowhere initially (not needed because PUT upsert); skip unless offline replays prove problematic.
- Validation: reuse DTO classes; `@Min(0)` on counts, `offering` regex `^\d{1,8}(\.\d{1,2})?$`, `present_count <= members_count`, string arrays capped (e.g. 20 items, 60 chars), `*_other` max 180 (column limit). `date` not in future (as attendance). Weekday-match check only when creating the attendance (as today).
- Old endpoints stay: `/life-groups/:id/attendance*` (old app builds, analytics reads), `/forms/life-group-reports*`. Fix them in Phase 0: create authorization via scope/led-groups (not @Roles), reject `life_group_id` outside allowed set (403), derive area/sector, accept co-leader. `PATCH` through the old route must re-sync `committed_*` if linked.
- Edit policy for combined records (proposal; Q5): leader/co-leader of the group and any actor in scope may edit attendance and report until a configurable cutoff (default 14 days after meeting_date, or until the next meeting + 1 day); admin always. Implement as a new `canEditMeetingRecord` in the meetings service instead of overloading `FormSubmissionPolicyService.canEdit` (24h submitter). The old `PATCH /forms/life-group-reports/:id` keeps 24h behavior unless the report is linked, then uses the new policy.
- Who may fill: leader, co-leader, admin/pastor, area/sector leader within scope (as attendance). Notification recipients remain leader + co-leader only.
- Catalog: set `life-group-reports` write list unchanged for roles, but add a computed flag so mobile Formulários hides the entry for fixed-day groups (user is sent to the combined screen) — decision Q7. Keep it for admin (admin-ui).

### 5.3 Reminder (one rule)
- Reuse rule type `life_group_attendance` (rename the label to "Reunião do Life Group"; keep the type id to avoid migrating enums, dispatch logs, history). Config adds: `followup: { enabled: bool, weekday: number, hour: number, title, message }` (defaults: enabled true, weekday 0, hour 20, "Relatório do Life Group pendente"). Optional `report_required: true`.
- Primary push: unchanged timing (meeting_start + hours_after, Sao Paulo), new copy ("Registre a presença e o relatório do seu Life Group"), same deep link `paz://presenca/{gid}/{date}`, skip if attendance AND report already exist (today: skip only if attendance exists). If attendance exists but report missing, the primary push is skipped and the follow-up handles it.
- Follow-up push: only groups whose meeting of that week has attendance but no report (or neither), recipients leader + co-leader, dedupe key `life_group_meeting_followup:{gid}:{date}`, claim-first (insert log row first, delete on send failure; copy the tasks-evaluator pattern). Same deep link and category `life_group_attendance`.
- Fix on the way: make the primary push claim-first too (race noted above).
- `form_report` for `life-group-reports`: delete the entry from DEFAULT_CONFIGS and via a data migration on `reminder_rules` (pattern of 1780900000004) at Phase 4. Until then, make the entry smart (skip groups with a report that week) to stop double noise. Add the same dedupe/skip rule so a leader who already completed the combined flow gets nothing. Keep the other `form_report` entries (sector, area, service) untouched. Also fix their server-local-timezone use when touched (not required for this feature).
- Admin-ui `reminder-settings.tsx`: add card for the rule type (it does not exist today: title/description/config editor for `hours_after_meeting_start` + follow-up fields), and remove life-group-reports from the form_report entries list UI if it lists them by slug. Add `life_group_attendance` to its `ReminderRule['type']` maps.
- Regression guard test already exists (`reminders/types/reminder-config.spec.ts` asserts form_slug resolves in catalog): update when removing the entry.

### 5.4 Deep links and old pushes
- Reuse `paz://presenca/{lifeGroupId}/{date}` for the combined screen. New apps route it to the combined screen; OLD apps open the old attendance editor (attendance half only; the new server still computes report completeness, so the follow-up still nudges the report). Zero push-payload versioning needed; already delivered pushes keep working in both app versions.
- Optionally add the alias `paz://reuniao/{lifeGroupId}/{date}` parsed to the same destination (cheap) so that the doc/URLs read better; do not emit it until the min app version is raised. `paz://form/life-group-reports` and `paz://formularios` keep working (fixed-day groups: open the combined screen for the group's latest/next meeting when a user opens the form entry; Q7).
- Files: Android `PushNotificationHelper.kt`, `PazNavGraph.kt`, `Screen.kt`; iOS `DeepLinkDestination.swift`, `DeepLinkViews.swift`, `MainTabView.swift`; tests `PushNotificationHelperTest.kt`, `DeepLinkDestinationTests.swift`.

### 5.5 Mobile
- Shared KMP: new `LifeGroupMeetingRepository` (+ impl, models `LifeGroupMeeting`, request/response DTOs) next to `LifeGroupAttendanceRepositoryImpl`/`LifeGroupReportRepositoryImpl`; register in `SharedModule.kt`. Reuse existing read models (`LifeGroupWeeklyReport`).
- Android: new `lifegroupmeeting/` package (screen, ViewModel with sections state, UiState), replacing `lifegroupattendance/` editor+history entry; replace the "Presença" card in `MinistryDetailScreen.kt` with a "Reuniões" card to a history list showing per meeting date two chips (Presença, Relatório) -> tap opens the combined screen (edit). iOS mirror in `Features/LifeGroupMeeting/` + `MinistryDetailView.swift`. Remove `FormType.life_group_report` submit branch from `FormDetailViewModel.kt` and the iOS equivalent once combined ships (keep read-only report list/detail `lifegroupreports/` and `LifeGroupReports/`).
- Draft/offline: persist Section B inputs and unsaved attendance toggles locally keyed `(lifeGroupId, meetingDate)` (DataStore/SharedPreferences on Android, UserDefaults on iOS; JSON; clear on successful PUT; show "rascunho restaurado" banner). Save buttons call PUT; on network failure keep the draft and show retry (no silent background queue in v1; a leader can re-open from the same push). Attendance saved separately means the critical data goes out first. Because PUT is idempotent by (group,date), resubmission is safe. Drafts must not store anything sensitive beyond counts/offering (offering is financial but low sensitivity; clear on logout).
- Prefill: `GET .../meetings/:date` returns draft roster; defaults present=true (as today) is risky for accuracy: keep existing behavior but show an explicit "Todos presentes" toggle; open product question Q3.
- Derived fields shown read-only in Section B ("Comprometidos: 8 | Presentes: 6, calculado da presença"), updated live as toggles change; if Q1 chooses a separate "comprometidos" input, show it editable with default from roster.
- Offering input: currency mask to decimal string; negative rejected.
- Multi-selects: pastoring/training/leader_attended option lists: the backend has no enum, so the option values must be agreed (Q8) and put in ONE shared place (backend constant exposed via `GET /forms/life-group-reports/options` or hardcoded identically in clients). Recommend a backend constant + validation `@IsIn` after existing data is audited.

### 5.6 Admin-ui
- Fix existing report form payload (arrays, `leader_attended`, `*_other`) and types in `lib/api/types/formularios.ts` independent of the merge (Phase 0).
- Add a "Reunião" detail view per group/date (attendance roster + report) from the life group management page (`life-groups-management.tsx`) and from `/formularios/life-group-reports` rows ("ver presença"). Optional edit for admin.
- Analytics: `life-group-analytics` keeps reading attendance (no change). Reports-based admin views keep reading `committed_members_present`, which is now server-synced for linked records. Add an admin consistency card later (reports whose `committed_members_present != attendance.present_count`) for legacy rows.
- Reminder settings UI as in 5.3. Update Postman collections (`admin-ui/postman`, backend postman if any) for the new endpoint (repo checklist in forms.md).

### 5.7 Existing data and migration
- Attendance history: untouched, still the analytics/tasks source of truth. No migration.
- Reports: no data transform required. Migration steps: (1) duplicate scan on (life_group_id, date) for non-deleted rows; if dupes exist soft-delete none automatically, produce a list and let admin choose; (2) add `attendance_id` nullable + partial unique index; (3) optional best-effort backfill linking each legacy report to the attendance row of the same group in the same Mon-Sun week (only when exactly one candidate) with `committed_members_present` left AS SUBMITTED (do not overwrite historic submissions); ship as a dry-run script first. (4) data migration removing the `life-group-reports` form_report entry (Phase 4).
- Account deletion: `users.service.ts` (~L488) deletes `life_group_reports` by submittedById; new FK `attendance_id` is on the report side, so no new blocker; attendance already cascades per entries. Verify the raw column name used there (`"submittedById"`) still matches after migration.

### 5.8 Flags / rollout / compatibility
1. Backend first, additive only (new endpoint, nullable column, index after duplicate check). Old apps unaffected.
2. Server flag `LIFE_GROUP_MEETING_V2` (env or a key in the reminder rule config `followup.enabled`) controls the new copy/follow-up and skipping of form_report life-group entry; default off until the new app build is in stores.
3. Apps: ship combined screen behind a remote/server flag (the app asks `GET /me/...` or uses build gating) so staged rollout is possible; keep old Presença screen in the same build until the flag is fully on, then delete it (cleanup phase).
4. Minimum app version: do not force. Because the push deep link is unchanged, old apps degrade to attendance-only; the follow-up push still covers the report; leaders on old apps can use the web admin or update.
5. Kill switch: turning the flag off restores old copy + form_report entry (keep the entry in a migration-reversible way: store the removed entry in the migration `down`).
6. Pilot: enable for one sector first (rule config is global today; a per-sector allowlist would need new config; simplest = env allowlist of life_group ids for the new push copy; Q10).

### 5.9 Testing strategy
- Backend unit/e2e (jest, existing specs as templates: `life-group-attendance.service.spec.ts`, `life-group-reports.service.spec.ts`, `life-group-attendance-reminder.evaluator.spec.ts`, `form-report-reminder.evaluator.spec.ts`): meetings service (create both, attendance only, report only -> 409, edit attendance re-syncs report snapshot, co-leader allowed, non-member 403, out-of-scope 403/404, future date, wrong weekday, duplicate user ids, unknown users, concurrent double PUT -> one row each, transaction rollback when report validation fails after attendance write, unique index violation mapping, legacy report linked/unlinked); policy cutoff tests with fake timers; old endpoints unchanged contract tests (including Phase 0 auth fixes); evaluator tests: primary push skip when both exist, follow-up only when report missing, dedupe/claim-first under two simulated instances, midnight rollover, groups without fixed day, co-leader recipient, timezone; reminder-config validation for `followup`; migration up/down on a scratch DB with duplicate fixtures.
- Mobile: shared repository tests (Ktor mock, like `LifeGroupReportRepositoryTest`), ViewModel tests for derived counts, draft restore, retry after failure; Android deep link test `PushNotificationHelperTest`; iOS `DeepLinkDestinationTests`; manual matrix: leader, co-leader (role member), 2-group leader, admin, group without fixed day, old build opening the same push.
- Admin-ui: form payload test for arrays; reminder settings card.
- Pre-merge: repo validation commands in `.ai/commands.md` (not re-listed here).

## 6. Phased plan

| Phase | Scope | Main files/modules | Risk |
|---|---|---|---|
| 0. Stabilize report (independent, ship now) | Fix report create authorization (scope + led groups, co-leaders), validate life_group_id access, derive area/sector, add @Min/length validation, fix admin-ui payload/types, stop mobile from submitting the broken payload (hide or fix), smart form_report skip when already submitted | `life-group-reports/*`, `forms-catalog.service.ts`, `form-report-reminder.evaluator.ts`, admin-ui form + types, Android `FormDetailViewModel.kt`, iOS form code | Low-Med (auth change; clients currently broken so little to regress) |
| 1. Backend meetings API | Migration (attendance_id, partial unique after dupes scan), `life-group-meetings` module with GET/PUT, extracted shared upsert functions, edit policy, audit, tests | `backend/src/life-group-meetings/` (new), `life-group-attendance.service.ts` (extract), reports service, migrations | Medium (transaction + shared logic, duplicates in prod data) |
| 2. Reminder consolidation | Extend `life_group_attendance` rule (follow-up, claim-first, skip logic, new copy behind flag), admin-ui settings card, update DEFAULT_CONFIGS and config validation | `reminders/evaluators/life-group-attendance-reminder.evaluator.ts`, `reminders/types/reminder-config.ts`, reminders service validation, admin-ui `reminder-settings.tsx` | Medium (duplicate/missed pushes; test with fake clock) |
| 3. Mobile combined screen | KMP repo + models; Android + iOS screens, history list, drafts, deep link routing reuse, flag gating | `kmp-mobile/shared/...`, `android/.../lifegroupmeeting`, `ios/.../LifeGroupMeeting`, MinistryDetail screens, nav files | Medium-High (two platforms, offline drafts) |
| 4. Cutover and cleanup | Enable flag, remove `form_report` life-group entry via data migration, remove old Presença card/screens and mobile report submit path after adoption, update docs `.ai/features/life-groups.md`, `forms.md`, `notifications.md`, Postman | various | Low-Med |
| 5. Admin-ui meeting view + legacy reconcile | Group/date detail, mismatch card, optional backfill script | admin-ui, scripts | Low |

Phase 0 is valuable even if the merge is never done. Phases 1 and 2 can be built in parallel with 3 once the response contract in 5.2 is frozen.

## 7. Risks
1. Leaders on old app versions only see attendance; follow-up covers it, but report completion lags until adoption.
2. Derived `committed_*` semantics (Q1/Q2) wrong -> wrong historic comparability with legacy reports; mitigate by naming the snapshot columns' source in docs and keeping legacy values untouched.
3. Duplicate reports in prod block the partial unique index; migration must be gated on a scan.
4. Transaction coupling: a report validation error must not lose attendance: split payload semantics (attendance-only PUT succeeds independently; combined PUT is all-or-nothing and the client sends attendance first, report second to keep the critical data safe).
5. Edit policy change widens who can alter reports (co-leader, up to cutoff) and attendance of past meetings affects task eligibility; keep audit rows and surface "edited by" in admin.
6. Reminder timing: form_report uses server-local TZ while attendance uses America/Sao_Paulo; the follow-up must use the zoned helpers. Multi-instance duplicates: use claim-first.
7. Groups without fixed meeting day lose both reminders (already true for attendance); they need the legacy report path or a manual "new meeting for date" entry (Q7).
8. Android channel/prefs: category stays `life_group_attendance` (not opt-outable, channel `paz_life_group`); changing category would reroute pushes — do not.
9. Mobile draft storage leaks across accounts if not cleared at logout.
10. Scope creep: option lists enumerations (Q8) and guest linkage (form-guests) should stay out of this change.

## 8. Open product questions
- Q1. Is "Comprometidos" (committed_members) the whole roster, or a subset (e.g. members who committed)? If subset, we need a stored per-member flag or a manual input.
- Q2. Do leader/co-leader/visiting members count in committed_members_present? (Today leaders appear in the roster only if they are `users` of the group.)
- Q3. Default for new attendance: all present (today) or all absent/unset?
- Q4. Should the report be mandatory every week for every fixed-day group, and what happens when the leader skips (escalate to sector leader)?
- Q5. Edit window for the combined record (proposal 14 days) and whether the co-leader and area/sector leaders may edit; who can delete (admin only today).
- Q6. Is a second push (follow-up) acceptable, and at which weekday/hour? Or strictly one push ever (then Section B completion depends on the leader reopening the app)?
- Q7. Groups without a fixed day, or extra/cancelled meetings: how does a leader register a meeting (pick date manually) and where does the entry point live once the Presença tab is gone? Should Formulários still list "Relatório de Life Group"?
- Q8. Canonical option lists for `leader_attended`, `pastoring_activity_type`, `training_activity_type` (currently free strings) and wording of "Outro".
- Q9. How many reports exist in prod and are they trustworthy given the clients could not submit? Decides backfill effort.
- Q10. Pilot scope (one sector?) and whether the old Presença push copy should remain for non-pilot groups.
- Q11. Should `kids_0_to_11` / `guests` eventually be derived from other features (group `kids_count`, form-guests)?
- Q12. Should area/sector leaders get a per-sector "pending reunions" view powered by the same records (extra value of the merge)?

## 9. Docs to update when building
`.ai/features/life-groups.md` (Attendance + report sections), `.ai/features/forms.md`, `.ai/features/notifications.md` (rule, dedupe keys, deep link), `.ai/apps/*` mobile/admin notes, Postman collections.
