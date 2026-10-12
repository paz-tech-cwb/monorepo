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

Life group visibility follows cascade scope:

- Admins and pastors can see all groups.
- Area leaders can see groups inside their areas.
- Sector leaders can see groups inside their sectors.
- Life group leaders can see their own group.
- Members see only member-facing group information unless a workflow grants more.

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

Tables (migration `1795900000004-CreateLifeGroupTasks`): templates, overrides,
assignments (incl. `declined_user_ids int[]`), member_settings (incl. `grandfathered`),
group_settings, skips, plus `user_life_groups.joined_at`.
Migration `1795900000003-AddLifeGroupTasksEnumValues` adds the enum values
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
- Migration `1795900000005-AddLifeGroupStudyNotificationCategory` adds
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
