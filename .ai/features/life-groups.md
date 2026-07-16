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

## Agent notes

- Do not duplicate hierarchy rules in clients if the backend can provide scoped results.
- Keep meeting day/status enums centralized or API-backed when possible.
- Changes to hierarchy shape can affect forms, reports, notifications, and member journey.
