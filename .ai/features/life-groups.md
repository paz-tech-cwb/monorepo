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

### `GET /life-groups/me`

Returns the viewer's groups: led, co-led, supervised (group is in a sector the
viewer leads/co-leads or in any sector of an area the viewer leads/co-leads) and
rostered. Each item has the usual life group fields plus:

- `relationship`: `leader` | `co_leader` | `supervisor` | `member`, precedence in
  that order when several apply.
- `is_supervised`: `true` whenever the viewer supervises the group via
  area/sector, even if `leader`/`co_leader` wins the precedence.

Only `/me` carries these two fields (other endpoints are unchanged). A supervisor
also receives the roster (`members`) of supervised groups from `/me` and
`GET /life-groups/:id`. Plain members are never widened. `GET /life-groups`
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

## Agent notes

- Do not duplicate hierarchy rules in clients if the backend can provide scoped results.
- Keep meeting day/status enums centralized or API-backed when possible.
- Changes to hierarchy shape can affect forms, reports, notifications, and member journey.
