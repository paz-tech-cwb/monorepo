# Ministry Feature — Design

**Date:** 2026-06-13
**Status:** Approved (design) → planning

## Goal

Generalize the existing `atmosphere` module into a first-class, generic **Ministry**
feature across backend, admin-ui, and mobile. A ministry can be organized either as a
set of **teams** (each with its own people) or as a flat list of **people** attached
directly. Every group/ministry/team that has a leader supports a **leader pair**
(husband + wife), where the second leader is optional.

## Key Decisions

- **Generalize, don't duplicate:** evolve `atmosphere` → `ministries`. Existing
  atmosphere ministry rows become ministry rows.
- **Leader pair = twin columns:** each structural entity keeps `leader_id` and gains a
  nullable `co_leader_id`. Both are `User` FKs; the co-leader (spouse) is optional. No
  `User.spouse` link — the two leaders are independently selected. "Husband and wife" is
  descriptive, not enforced.
- **App-wide leader refactor scope = structural leaders only:** `ministries`,
  `ministry_teams`, `life_groups`. Report/conversion `leader` fields are **attribution**
  (who filed a report) and stay single — out of scope.
- **Either/or membership:** a ministry has `membership_mode` of `'teams'` or `'direct'`.
  In `'direct'` mode people attach to the ministry; in `'teams'` mode people attach only
  to teams. Not mixed.
- **Rename to ministries:** tables and `/api/atmosphere/*` → `/api/ministries/*`.
  Blast radius is backend + admin-ui + Postman. Mobile is unaffected by the rename
  because it reads ministries from the church-data endpoint, not the admin CRUD.

## Data Model

```
Ministry
  id, name, description
  leader: User,  co_leader: User?          (twin columns)
  membership_mode: 'teams' | 'direct'
  ├─ 'direct' → members: User[]            (ministry_members)
  └─ 'teams'  → teams: Team[]
                  Team
                    id, name, ministry_id
                    leader: User, co_leader: User?
                    members: User[]         (ministry_team_members)
  created_at, updated_at
```

### Table renames (migration)

| From | To |
|------|----|
| `atmosphere_ministries` | `ministries` |
| `atmosphere_teams` | `ministry_teams` |
| `atmosphere_ministry_members` | `ministry_members` |
| `atmosphere_team_members` | `ministry_team_members` |

### New columns

- `ministries.description` (varchar, nullable)
- `ministries.co_leader_id` (FK user, nullable)
- `ministries.membership_mode` (varchar/enum, default `'teams'`)
- `ministry_teams.co_leader_id` (FK user, nullable)
- `life_groups.co_leader_id` (FK user, nullable)

## Backend Changes

- Rename module `atmosphere/` → `ministries/`; route `/api/atmosphere/*` →
  `/api/ministries/*`. Rename entities/DTOs/service/controller/specs.
- DTOs: create/update ministry gains `description`, `co_leader_id`, `membership_mode`;
  create/update team gains `co_leader_id`.
- Validation: in `'direct'` mode reject team operations; in `'teams'` mode reject
  direct-member operations. Switching mode while data exists is a deliberate operation
  (clears the now-invalid collection, or is blocked — see plan).
- GET-by-id eager-loads `leader`, `co_leader`, teams (+ their leader/co_leader and
  members) so the view screen has everything in one call.

## Admin-UI Changes

- Rename `lib/hooks/use-atmosphere` → `use-ministries`; API types
  `AtmosphereMinistry/Team` → `Ministry/MinistryTeam` (+ `description`, `co_leader`,
  `membership_mode`).
- Reusable `<LeaderPairPicker>` (leader + optional co-leader), used by ministry, team,
  and life-groups.
- Create/edit ministry dialog: name, description, leader pair, membership-mode toggle.
- Either/or UX: `teams` mode reveals team management; `direct` reveals a member list.
  Switching modes with existing data prompts a confirm.
- View ministry: name, description, leader pair prominent, then teams (each with leader
  pair + members) or the direct member list.

## Mobile Changes (member-facing)

The mobile `Ministry` model (`id, name, description, image_url`) is read-only and comes
from the church-data endpoint. Enrich it to reflect the new structure:

- Extend the shared `Ministry` model with the leader pair and, where available, teams /
  members count.
- Update `MinistryDetailScreen` to display the leader pair (and teams/members if exposed).
- No management/admin UI on mobile — view only.

## Out of Scope

- Report/conversion `leader` fields (attribution, stay single).
- Sectors/areas leaders (no leader relation today).
- Mobile management/admin UI.

## Phasing

1. **Backend ministries:** rename migration + new columns + dual leaders on
   ministry/team + DTO/validation + endpoint rename.
2. **Admin-UI ministries:** hooks/types rename, `<LeaderPairPicker>`, create/edit dialog,
   either/or UX, view screen.
3. **Life-groups co-leader:** backend `co_leader_id` + admin-ui adoption of
   `<LeaderPairPicker>`.
4. **Mobile:** enrich shared `Ministry` model + detail screen with leader pair.
5. **Postman:** update collection routes atmosphere → ministries.
