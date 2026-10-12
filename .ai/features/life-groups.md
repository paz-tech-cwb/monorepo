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
  records, not 3 consecutive weeks and not days since joining. Members existing
  at migration time were grandfathered with explicit eligible=true rows carrying
  the system note `grandfathered at migration`; `GET task-members` never returns
  that note and instead exposes `grandfathered: true`, and clients hide "Voltar ao
  automático" for those rows (resetting would drop an established member below
  the presence threshold). A blank note from a client keeps the marker; a real
  leader note replaces it.
  `user_life_groups.joined_at` (default now()) is stored for display/audit only.
  Leader notes on a member are never returned to member endpoints; per-template
  exclusions are supported; `reset_to_automatic` deletes the explicit row.
- **Decline / re-roll**: members decline unlimited times; the same row gets a
  new assignee (`source=reroll`, notification flags reset) and the new assignee
  and leader are pushed. If nobody qualifies, decline leaves the row `declined`
  and notifies the leader. Leaders can re-roll or manually reassign (any active roster member).
- **Skip dates**: `life_group_task_skips` marks meeting dates with no tasks; the evaluator ignores them.
- **Pushes**: reminder rule `life_group_tasks` (enabled by default,
  `days_before_meeting: [3,1]`, `hour: 9`). Largest offset generates and notifies
  assignees; smaller offsets only remind already-assigned members. See `features/notifications.md`.

Endpoints (prefix `/api`):

- Admin: `GET/POST /life-group-task-templates`, `PATCH/DELETE /life-group-task-templates/:id`, `PUT /life-group-task-templates/reorder`.
- Leader/co-leader/admin: `GET/PUT /life-groups/:id/task-overrides|task-members|task-settings`, `GET/POST /life-groups/:id/task-skips`, `DELETE /life-groups/:id/task-skips/:date`, `GET /life-groups/:id/tasks?date=`, `POST .../tasks/generate` (`meeting_date` optional, defaults to next meeting; must be at most 7 days in the past and 60 days ahead, else 400), `POST .../tasks/reroll`, `PATCH .../tasks/:assignmentId`.
- Member: `GET /me/life-group-tasks`, `GET /me/life-group-tasks/:id`, `POST /me/life-group-tasks/:id/decline`.

Tables (migration `1795900000004-CreateLifeGroupTasks`): templates, overrides,
assignments, member_settings, group_settings, skips, plus `user_life_groups.joined_at`.
Migration `1795900000003-AddLifeGroupTasksEnumValues` adds the enum values
(separate because Postgres cannot use a new enum value in the same transaction).
Assignments cascade on `users` delete (account deletion must not fail on task history).
Running migrations and deploying are human gates; they have not been run by agents.

Clients: admin-ui "Tarefas do Life" page (templates) plus a "Tarefas" panel on
life groups; mobile task guide screen, "Minhas tarefas" card on life group
detail, and leader-only "Elegibilidade para tarefas" screen. Deep link: `paz://tarefa/{assignmentId}`.

## Agent notes

- Do not duplicate hierarchy rules in clients if the backend can provide scoped results.
- Keep meeting day/status enums centralized or API-backed when possible.
- Changes to hierarchy shape can affect forms, reports, notifications, and member journey.
