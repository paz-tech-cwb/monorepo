# Feature: Life Groups

## Purpose

Represent small groups and the church leadership hierarchy around them.

## Domain hierarchy

```txt
Area
  └── Sector
        └── Life Group
              └── Members / Leaders
```

## Visibility

Life group visibility follows cascade scope, resolved by
`ScopeResolverService` (`forms-core/services/scope-resolver.service.ts`):

- Admins and pastors can see all groups (unrestricted, unchanged).
- Everyone else: scope is derived from the `leader_id` / `co_leader_id` rows the
  user actually holds, NOT from the role slug (roles are assigned manually and
  are not synced when a leader is set on an Area/Sector/LifeGroup, and
  co-leaders have no slug of their own). A user may lead several rows; all of
  them are unioned:
  - area leader/co-leader: every sector of every area they lead/co-lead, and
    every group in those sectors;
  - sector leader/co-leader: every group in every sector they lead/co-lead;
  - life group leader/co-leader: every group they lead/co-lead.
  `ResolvedScope` = `{unrestricted, areaIds, sectorIds, lifeGroupIds}` (unchanged
  shape; `sectorIds`/`lifeGroupIds` are unions). A user who leads nothing (plain
  member, guest, any slug) gets an empty scope. Endpoint `@Roles` guards still
  gate by slug, so widening the resolver never opens a role-gated endpoint.
- Members see only member-facing group information unless a workflow grants more.

### Row-based scope: read vs write (review decisions)

- Resolution cost: one user+role lookup plus ONE ids-only SQL (CTE over areas -> sectors -> groups); admin/pastor skip the second query. `GuestsService.findGuests` and `JourneyProgressService` still resolve once more themselves (their routes do not run `ScopeGuard`; reusing `req.formScope` would need adding the guard, deferred).
- READ widening (product/privacy decision, kept): any user holding a leader/co-leader row now gets scope-filtered READ data regardless of role slug (previously a slug-less leader/co-leader got an empty scope). Endpoints guarded only by `ScopeGuard` (no `RolesGuard` on GET) are affected: `GET member-registrations`, `GET form-guests`, `GET form-conversions`, `GET life-group-reports` (list, `:id`, `:id/audit`), `GET casa-de-paz-reports` (list, `:id`, `:id/audit`), plus life-group-analytics. This is consistent with the attendance/report co-leader fallbacks. Open product question: should slug-less leaders/co-leaders see registrations/guests/conversions PII of their groups and sectors? If not, add `RolesGuard` to those GETs.
- WRITE authority is NOT widened: `casa-de-paz-reports` update/delete bypass the owner/24h policy only for `unrestricted` scope or when the actor's role slug is `area_leader`/`sector_leader` AND the sector is in scope. A slug-less (e.g. `member`) sector/area co-leader sees the sector's reports but edits/deletes only under the normal policy.
- `life-group-analytics` overview: the members universe for a scoped caller is now `users.sectorId IN sectors OR lifeGroup IN scoped groups`, so users rostered in a scoped group but with a different/null `sectorId` are counted. `members_total` can therefore be larger than before for sector-scoped callers (more correct; intentional).

### `GET /life-groups/me`

Returns the viewer's groups: led, co-led, supervised (group is in a sector the
viewer leads/co-leads or in any sector of an area the viewer leads/co-leads) and
rostered. Each item has the usual life group fields plus:

- `relationship`: `leader` | `co_leader` | `supervisor` | `member`, precedence in
  that order when several apply.
- `is_supervised`: `true` whenever the viewer supervises the group via
  area/sector, even if `leader`/`co_leader` wins the precedence.

Only `/me` carries these two fields (other endpoints are unchanged). `/me` omits the roster (`members: null`) for supervisor-only rows (viewer is not
leader/co-leader and is not rostered) and keeps `member_count`; leader,
co-leader and member rows keep the roster. `GET /life-groups/:id` shows the
roster to a supervisor of that group (the supervision check is restricted to the
requested id). Plain members are never widened. `GET /life-groups`
(discovery/admin-ui list) is intentionally unscoped (every authenticated user
sees every group, rosters hidden) and was not changed. Response order is name
ascending; clients decide ranking.

Clients: Kotlin `LifeGroup` has optional `relationship` / `isSupervised`
(defaults null / false, so older backends and older apps keep working; the
Kotlin JSON config uses `ignoreUnknownKeys`). iOS reads the shared model.
Home card recommendation (open product question): rank
leader > co_leader > member > supervisor, keep the cap at 3, and when a
supervisor has more than 3 supervised groups show one summary card ("Você
supervisiona N grupos") rather than alphabetical supervised cards.

## Attendance (Phase 1)

Leaders (and co-leaders) can record per-meeting attendance for their own
group:

- `GET /life-groups/:id/attendance` — history list, newest first.
- `GET /life-groups/:id/attendance/:date` — the saved record for that date,
  or a draft built from the group's current roster if nothing was saved yet
  (`is_draft: true`).
- `PUT /life-groups/:id/attendance/:date` — upsert; body is `{ entries: [{ user_id, present }] }`.

Data model: `life_group_attendance` (one row per `(life_group_id,
meeting_date)`, unique constraint, denormalized `present_count`/
`members_count`) + `life_group_attendance_entries` (roster snapshot).
Reopening a past record for edit never adds members who joined the group
after the record was first saved — only the originally captured roster is
editable.

Access reuses `ScopeGuard`/`ScopeResolverService` (same as other life-group
forms), with a local fallback: a co-leader has no dedicated role slug, so the
service also allows access when the requesting user is the group's
`co_leader_id` directly.

Every life group is assumed to have a fixed `meeting_day`/`meeting_time`
going forward. If a group's `meeting_day` is "Sem dia fixo" or its
`meeting_time` is null, the attendance reminder evaluator skips it (see
`features/notifications.md`) rather than guessing a meeting date.

Deep link: `paz://presenca/{lifeGroupId}/{date}`.

## Meetings API (phase 1: attendance + report in one record)

Backend only, additive. Design: `.pipeline/design-attendance-report-merge.md`.
Module `backend/src/life-group-meetings/`.

- `GET /api/life-groups/:lifeGroupId/meetings/:date` and `PUT` (same path),
  `AuthGuard('jwt')` + `ScopeGuard`, no `@Roles` (a co-leader / `member`-role
  leader works). Access = attendance's rule, shared in
  `life-group-attendance/life-group-access.util.ts`: admin/pastor unrestricted,
  group in scope (area/sector supervisors via `ScopeResolverService`, keyed off
  `leader_id`/`co_leader_id` rows), else the group's own leader/co-leader id.
- `PUT` body `{ attendance?: { entries: [{ user_id, present }] }, report?: {
  kids_0_to_11, guests, mdas, offering, committed_at_tadel, committed_at_culto,
  leader_attended[], disciples_count, disciples_discipled_this_week,
  pastoring_activity_type[], pastoring_activity_other?, training_activity_type[],
  training_activity_other? } }`, at least one. `report` is a full replace.
  Client-sent `date`, `area_id`, `sector_id`, `life_group_id`, `committed_members`,
  `committed_members_present` are not in the DTO and are ignored (global pipe
  strips non-`@Expose` keys); the server derives them.
- Response of both verbs: `{ life_group_id, meeting_date, attendance, report,
  derived: { committed_members, committed_members_present }, can_edit,
  edit_deadline, report_blocked_reason }`. `attendance` is the saved record
  (`is_draft: false`, `default_present: null`) or a draft from the current roster
  (`is_draft: true`, `default_present: true`, everybody present); its `entries`
  are the roster snapshot. `report` is the same shape as
  `/forms/life-group-reports` or `null`. `report_blocked_reason` is
  `group_has_no_sector` | `sector_has_no_area` | `null`.
- Errors: 400 invalid date/body/roster/weekday, 403 no access or
  `edit_window_closed`, 404 group, 409 `attendance_required` (report with no
  attendance existing or sent in the same PUT), 422 (`group_has_no_sector` /
  `sector_has_no_area`: area/sector are derived from the group, never invented;
  attendance alone still saves).
- One DB transaction per PUT, guarded by `pg_advisory_xact_lock(4207,
  hashtext('<group>:<date>'))`, then find-then-upsert, so concurrent PUTs give one
  attendance row and one report row even where the partial unique index below is
  absent. Idempotent by (group, date). Audit rows for both slugs
  (`life_group_attendance`, `life-group-reports`) are written in the same
  transaction (`FormSubmissionAuditService.record(params, manager)`).
- Derived fields (product decisions Q1/Q2): `committed_members` = attendance
  `members_count` (the WHOLE roster snapshot, no manual input, no per-member flag);
  `committed_members_present` = `present_count` (leader/co-leader count only when
  they are on the roster and marked present). They are snapshots in
  `life_group_reports`, linked through `attendance_id`, and re-synced on EVERY
  attendance write, including the OLD `PUT /life-groups/:id/attendance/:date`
  (hook in `LifeGroupAttendanceService.upsertInTransaction` ->
  `LifeGroupReportSnapshotService`), in the same transaction. Unlinked legacy
  reports are never touched by an attendance-only change; a meetings PUT with a
  `report` links and overwrites the legacy report of that date.
- Default draft (Q3): all present, unchanged. Mobile can show an explicit "Todos
  presentes" toggle from `default_present`.
- Edit policy (Q5): `LIFE_GROUP_MEETING_EDIT_WINDOW_DAYS = 14`
  (`common/constants/life-group-meeting.ts`, optional env override of the same
  name, positive integer). Creating or editing either half is allowed for
  everyone with access until meeting date + 14 days (inclusive, America/Sao_Paulo
  calendar days: day 14 allowed, day 15 denied); only `admin` is never limited
  (pastor is bound). Reads are always allowed. `edit_deadline` is `YYYY-MM-DD`
  (last editable day); `can_edit` is per viewer.
- Validation: attendance entries 1..500 (plus the attendance rules: roster-only
  ids on first save, no duplicates, not in the future, weekday must match
  `meeting_day` only when creating, unless flagged as an extra meeting (below); groups without a fixed day accept any past
  date, same as attendance); report counts integers 0..100000, `offering` string
  `^\d{1,8}(\.\d{1,2})?$`, string arrays max 20 items x 80 chars, `*_other` max 180.
- Extra meetings (product decision Q7, "extra meetings: yes"): a group WITH a fixed
  `meeting_day` may record a meeting on another weekday only with an explicit
  flag. `PUT` body top-level `extra_meeting: true` (boolean; anything else -> 400;
  omitted = false); `GET .../meetings/:date?extra_meeting=true` previews the draft (only the exact lowercase strings `true`/`false` are accepted, anything else is a 400; the preview does NOT check the weekly cap, so the later PUT can still answer 409 `extra_meeting_limit_reached`)
  for such a date. Attendance responses (inside the meetings view) carry
  `is_extra`. Rules (new records only; an existing record never re-checks the
  weekday):
  - fixed-day group, other weekday, flag missing/false -> 400
    `extra_meeting_required` (message tells to send `extra_meeting: true`);
  - flag on the group's regular weekday -> 400 `extra_meeting_on_regular_day`;
    flag on a group without a fixed day -> 400 `extra_meeting_not_applicable`
    (every date is already a regular meeting there, D3 unchanged);
  - the flag is fixed at creation: omitting it keeps the stored value, sending the
    opposite value for an existing record -> 400 `extra_meeting_immutable`
    (never silently flipped); a report-only PUT ignores the flag;
  - cap: at most `LIFE_GROUP_MAX_EXTRA_MEETINGS_PER_WEEK = 3` extra meetings per
    group per ISO week (Monday-Sunday of the meeting date), admin included;
    beyond that -> 409 `extra_meeting_limit_reached`. Creation takes
    `pg_advisory_xact_lock(4208, hashtext('<group>:<week monday>'))` (after the
    4207 meeting lock) so parallel PUTs for different dates of one week cannot
    exceed it. Editing an existing extra is never blocked by the cap;
  - everything else is unchanged for extras: not in the future, 14-day edit
    window (admin bypass), access rules, roster-only ids and the roster snapshot
    (`members_count`/entries fixed on first save), one record per (group, date),
    report link and `committed_*` snapshots, audit rows.
  Persistence: `life_group_attendance.is_extra boolean NOT NULL DEFAULT false`
  (migration `1796000000001-AddIsExtraToLifeGroupAttendance`, idempotent
  `ADD COLUMN IF NOT EXISTS`, `down()` drops it, no data rewrite: all existing rows
  are regular).
  Consumers:
  - Task eligibility (`LifeGroupTaskRosterService`): extras are real meetings and
    their `present=true` entries count toward `min_present_meetings`, but at most
    `LIFE_GROUP_COUNTED_EXTRA_MEETINGS_PER_WEEK = 1` extra meeting per group per ISO
    week counts (the earliest), so flagging several in a week cannot inflate
    eligibility. Regular meetings always count. "Earliest" is by meeting DATE, not
    by creation time: back-filling an earlier-dated extra later moves which extra
    counts and can lower a member's count retroactively (known behavior). The week
    is `date_trunc('week', meeting_date)` (Monday-based), identical to
    `isoWeekRange`, also across a year change (2026-12-28..2027-01-03 is one week;
    covered by unit and real-Postgres tests).
  - Analytics: extras are INCLUDED in `meetings_count`/`present_count`/
    `members_count`/`attendance_rate`; every bucket also has `extra_meetings_count`
    (additive, monthly and per-meeting granularity).
  - Reminders: unchanged and unaffected. The attendance reminder derives its meeting
    date from the group's fixed weekday, so an extra record on another date neither
    satisfies nor triggers it. For the follow-up/escalation logic (PR #98): treat an
    extra meeting like any meeting once its attendance exists (e.g. "attendance
    without report" applies the same), but never create reminders or expectations
    for extras, and never use their presence to mark the REGULAR date as recorded.
- Old contracts unchanged: attendance GET/PUT (no new fields; they keep rejecting
  every non-fixed weekday, there is no flag there; an already-saved extra record
  can still be edited through them, it stays extra), `/forms/life-group-reports*`.
  Only addition: a duplicate legacy `POST /forms/life-group-reports` for the same
  group+date answers 409 when the unique index exists (it used to create a duplicate).
  Legacy `PATCH` does not re-sync `committed_*` on a linked report (24h submitter
  rule unchanged).
- Reminders, push copy, `paz://presenca/{id}/{date}` deep link and the forms
  catalog are NOT changed in this phase (see `features/notifications.md`).
- Phase 2 (reminders v2, stacked on this API) changes the `life_group_attendance`
  reminder rule only behind the server flag `LIFE_GROUP_MEETING_V2` (default off):
  new combined copy, follow-ups to leader + co-leader 24h/48h/72h/96h after the
  meeting datetime (date + meeting_time, Sao Paulo; hourly tick tolerance 2h) while
  attendance exists and no report does, and a push to the sector leader + co-leader
  120h (day 5) after it. A report by either leader completes the reminder; extra
  meetings with attendance are followed up like regular ones.
  Details and switch-on steps in `features/notifications.md`.
- Weekday rule (verified for phase 2): `assertMatchesMeetingDay` returns early for a
  group without a fixed `meeting_day`, so ANY past date is accepted for those groups
  (manual "Nova reuniao" works). For a group WITH a fixed day, a new meeting on another
  weekday is rejected with 400, so an extra meeting on a different weekday is a known
  gap; relaxing it was judged not clearly safe (it protects task eligibility and roster
  snapshots from typos) and is left as an open product question. Reminders never target
  groups without a fixed day or extra meetings.

Migration `1796000000000-AddAttendanceLinkToLifeGroupReports` (human gate, not run
in any real environment by this branch): nullable `life_group_reports.attendance_id`
uuid FK -> `life_group_attendance(id)` ON DELETE SET NULL + index
`idx_lgr_attendance`; duplicate scan, then partial unique index
`uq_life_group_reports_group_date_active` on `(life_group_id, date) WHERE
deleted_at IS NULL` ONLY when no duplicates exist. Nothing is ever deleted: with
duplicates the migration still succeeds, creates no index, logs a warning and
records the groups in `life_group_report_duplicate_findings`. Find duplicates by hand:

```sql
SELECT life_group_id, date, array_agg(id ORDER BY created_at) AS ids, count(*)
FROM life_group_reports WHERE deleted_at IS NULL
GROUP BY 1, 2 HAVING count(*) > 1;
```

Soft-delete the extras, then either revert + run the migration again or run
`CREATE UNIQUE INDEX IF NOT EXISTS uq_life_group_reports_group_date_active ON
life_group_reports (life_group_id, date) WHERE deleted_at IS NULL;`. The index is
deliberately not an `@Index` on the entity (so `synchronize` never tries it on
dirty data); the app guards duplicates itself and, if several active reports exist
for one meeting, updates the oldest and logs a warning.

Postman: no collection exists in the repo (see `apps/postman-files.md`); the
endpoint list above is the reference.

## Rotating tasks

Each meeting, global tasks (templates) are automatically assigned to eligible
group members in rotation. Module: `backend/src/life-group-tasks/`.

- **Templates** (admin role only): name, description, markdown guidance,
  active flag, order. Delete is refused (409) once assignments exist; deactivate instead.
- **Per-group overrides**: leader/co-leader/admin can disable a template for
  the group and override its guidance (markdown).
- **Assignments**: one row per `(life_group_id, template_id, meeting_date)`
  (unique), with snapshots of task name/guidance, `status` (`assigned`,
  `declined`, `completed`), `source` (auto/reroll/manual), `notified_at`, `reminded_at`.
  Generation is idempotent and fair (history excludes the current date,
  skipped dates and declined rows). No eligible candidate: task stays
  unassigned and leader/co-leader are pushed.
- **Eligibility** (`eligibility.ts`, resolved per member): an explicit
  `life_group_task_member_settings.eligible` always wins (true or false);
  otherwise leader/co-leader are eligible; otherwise a member becomes eligible
  with >= `min_present_meetings` (group setting, default 3) `present=true`
  entries in `life_group_attendance_entries` for that group. Interpretation
  (to be confirmed with product): "3 weeks of presence" = 3 present attendance
  records, not 3 consecutive weeks and not days since joining. Only entries for
  meetings on or after the member's `user_life_groups.joined_at` (calendar day,
  America/Sao_Paulo) count, so attendance from a previous stint or from before
  they joined is ignored; leader/co-leader outside the join table are not
  filtered. This can only delay auto-eligibility, never grant it earlier.
  Members existing at migration time were grandfathered with explicit
  eligible=true rows flagged by the `life_group_task_member_settings.grandfathered`
  boolean column (no note text). `GET task-members` returns `grandfathered`
  (from the column), the real leader note in `reason`, and `joined_at` (ISO
  string or null); clients hide "Voltar ao automático" for grandfathered rows and
  the server answers 400 to `reset_to_automatic` on them (resetting would drop an
  established member below the presence threshold). Edits (note, exclusions,
  eligible=false and back to true) never change the flag: a grandfathered member
  stays grandfathered; to take them out of the rotation set eligible=false.
  Leader notes on a member are never returned to member endpoints; per-template
  exclusions are supported; `reset_to_automatic` deletes the explicit row.
- **Decline / re-roll**: members decline unlimited times; the same row gets a
  new assignee (`source=reroll`, notification flags reset) and the new assignee
  and leader are pushed. Each decliner is appended to
  `life_group_task_assignments.declined_user_ids`; decline and leader re-roll
  never pick the current assignee or anyone in that list again (no A -> B -> A
  ping-pong). If nobody qualifies, decline leaves the row `declined` and
  notifies the leader. Leaders can re-roll or manually reassign (any active roster
  member, including a previous decliner: an explicit leader choice).
- **Manual generate** (`POST .../tasks/generate`) pushes the newly created
  assignees (`notified_at IS NULL`) when the meeting is today..today+largest
  offset (a later meeting is left to the evaluator's offset push); same claim as
  the evaluator, so nobody is notified twice. On the largest-offset day itself,
  before the rule's `hour` (America/Sao_Paulo), the manual push is skipped
  (`notified_at` stays NULL) because the evaluator still runs later that day.
- **Skip dates**: `life_group_task_skips` marks meeting dates with no tasks; the evaluator ignores them.
- **Pushes**: reminder rule `life_group_tasks` (enabled by default,
  `days_before_meeting: [3,1]`, `hour: 9`). Largest offset generates and notifies
  assignees; smaller offsets only remind already-assigned members. See `features/notifications.md`.

Endpoints (prefix `/api`):

- Admin: `GET/POST /life-group-task-templates`, `PATCH/DELETE /life-group-task-templates/:id`, `PUT /life-group-task-templates/reorder`.
- Leader/co-leader/admin: `GET/PUT /life-groups/:id/task-overrides|task-members|task-settings`, `GET/POST /life-groups/:id/task-skips`, `DELETE /life-groups/:id/task-skips/:date`, `GET /life-groups/:id/tasks?date=`, `POST .../tasks/generate` (`meeting_date` optional, defaults to next meeting; must be at most 7 days in the past and 60 days ahead, else 400), `POST .../tasks/reroll`, `PATCH .../tasks/:assignmentId`.
- Member: `GET /me/life-group-tasks`, `GET /me/life-group-tasks/:id`, `POST /me/life-group-tasks/:id/decline`.

Tables (migration `1795900000007-CreateLifeGroupTasks`): templates, overrides,
assignments (incl. `declined_user_ids int[]`), member_settings (incl. `grandfathered`),
group_settings, skips, plus `user_life_groups.joined_at`.
Migration `1795900000006-AddLifeGroupTasksEnumValues` adds the enum values
(separate because Postgres cannot use a new enum value in the same transaction).
Assignments cascade on `users` delete (account deletion must not fail on task history).
Running migrations and deploying are human gates; they have not been run by agents.

Clients: admin-ui "Tarefas do Life" page (templates) plus a "Tarefas" panel on
life groups; mobile task guide screen, "Minhas tarefas" card on life group
detail, and leader-only "Elegibilidade para tarefas" screen. Deep link: `paz://tarefa/{assignmentId}`.

Late setup: the largest offset (D-3) generates. A smaller offset (D-1) also
generates, with the normal assignee push, when the meeting has no assignment rows
at all (e.g. the group's meeting day was set at D-2). If any rows exist (even all
declined) it only reminds, so leader rerolls are never overridden. A group set up
on D-1 after 09:00 or later still needs a manual generate. Generation is admin-ui
only (`POST /life-groups/:id/tasks/generate`); the mobile apps have no generate
action (leaders see "Elegibilidade para tarefas" and members see their tasks).

Templates are NOT seeded. Admin creates them in admin-ui "Tarefas do Life". A
ready-to-paste pt-BR starter set (name / description / guidance markdown):

1. **Palavra** / "Conduzir a palavra do encontro." / "## Como preparar\n- Leia o estudo da semana com antecedência.\n- Escolha 2 ou 3 pontos principais e uma pergunta para o grupo.\n- Reserve cerca de 20 minutos."
2. **Louvor/Ministração** / "Conduzir o momento de louvor e oração." / "## Como preparar\n- Escolha 2 ou 3 canções conhecidas pelo grupo.\n- Avise o grupo se precisar de ajuda com instrumento ou som.\n- Termine com um momento de oração."
3. **Oferta** / "Conduzir o momento da oferta e recolher o valor." / "## Como preparar\n- Faça uma breve fala sobre generosidade.\n- Recolha a oferta e entregue ao líder ao final.\n- Registre o valor para o relatório."
4. **Church Vision** / "Compartilhar uma mensagem sobre a visão da igreja." / "## Como preparar\n- Leia o material de visão indicado pela liderança.\n- Prepare uma fala de 5 a 10 minutos.\n- Conecte a visão com a vida do grupo."

Eligibility: an explicit per-member setting always wins (including "not eligible"
for a leader); otherwise leader/co-leader are eligible; otherwise a member needs
the group's minimum present records since `joined_at` (default 3).


## Estudo do Life (study)

Module: `backend/src/life-group-studies/`. Studies are church-wide (no per-group
targeting) and there is no draft state: creating a study IS publishing it.

- Write access (`LifeGroupStudyAccessService.canPublish`): leadership role slug
  (`admin`, `pastor`, `area_leader`, `sector_leader`, `life_group_leader`), OR
  `leader_id`/`co_leader_id` of any life group (matched by assignment, so a
  `member`-role leader counts), OR an admin grant in `life_group_study_publishers`
  ("assigned writer", managed in admin-ui `estudo-do-life/publicadores`). The
  controller has NO `@Roles` guard on create/update/delete (it used to block grant
  holders and `member`-role leaders before the service ran); the service decides.
  Edit/delete: admin, or the original publisher while still holding publish rights.
- Read: `canView` = `canPublish` OR on the roster of any life group.
- Push on create (once; `update` never re-notifies, there is no republish
  transition): category `life_group_study`, channel `paz_life_group_study`, deep
  link `paz://estudo-do-life/{id}`. Audience: every rostered member of any life
  group, every group leader and co-leader, and users with a leadership role,
  deduplicated, publisher excluded. The explicit ids are stored in
  `segment.filters.user_ids`. Dispatch failure never fails the create.
- Migration `1795900000008-AddLifeGroupStudyNotificationCategory` adds
  `life_group_study` to `notification_category_enum` (it was missing: on a
  migration-built DB the notification INSERT failed, so the push never went out).
- Clients: both mobile apps have list/detail/editor screens; the "new study"
  button shows when the signed-in role `isLeader`, so a `member`-role grant holder
  can write through the API but has no button on mobile (give them the
  `life_group_leader` role or publish on their behalf). admin-ui login is limited
  to leadership roles, so a plain `member` writer cannot use it either.

## Weekly life group reports (read API)

Form `life-group-reports` (`src/life-group-reports`, entity `life_group_reports`).
Read endpoints used per group by mobile (read-only list/detail):

- `GET /api/forms/life-group-reports?life_group_id=<int>` (param optional) —
  newest first (`created_at` DESC), soft-deleted excluded.
- `GET /api/forms/life-group-reports/:id` and `/:id/audit`.

Authorization (service level; `ScopeGuard` only resolves the scope): visible
groups = form scope (admin/pastor unrestricted, area/sector leader scope,
`life_group_leader` scope) PLUS every group where the viewer is `leader_id` or
`co_leader_id` (so a co-leader with role `member` works, and a leader of two
groups sees both). `life_group_id` outside that set => 403 (same as analytics).
`GET :id` and `:id/audit` answer 404 (not 403) when the report's group is not
visible (same rule as the list; being the submitter grants no extra read access).
`/:id/audit` is mapped to the admin-ui `AuditLogEntry` shape
(`id, form_slug, submission_id, action, diff, created_at, actor:{id,name}`); the
actor `User` entity is never serialized. Create/update/delete policy is
unchanged (`@Roles` on create still excludes co-leaders with role `member`).

Response is an explicit snake_case object (`toResponse`, controller uses
`@SerializeOptions({strategy:'exposeAll', excludeExtraneousValues:false})`):
`id, date, area_id, sector_id, life_group_id, committed_members,
committed_members_present, kids_0_to_11, guests, mdas, offering (string),
committed_at_tadel, committed_at_culto, leader_attended[], disciples_count,
disciples_discipled_this_week, pastoring_activity_type[],
pastoring_activity_other, training_activity_type[], training_activity_other,
submitted_by {id,name}|null, created_at, updated_at, deleted_at`. Before this
fix the raw entity serialized to `{}` under the global serializer
(characterized in the Phase 0 commit `852e7fa`).

## Agent notes

- Do not duplicate hierarchy rules in clients if the backend can provide scoped results.
- Keep meeting day/status enums centralized or API-backed when possible.
- Changes to hierarchy shape can affect forms, reports, notifications, and member journey.
