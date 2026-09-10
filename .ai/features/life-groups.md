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

## Agent notes

- Do not duplicate hierarchy rules in clients if the backend can provide scoped results.
- Keep meeting day/status enums centralized or API-backed when possible.
- Changes to hierarchy shape can affect forms, reports, notifications, and member journey.
