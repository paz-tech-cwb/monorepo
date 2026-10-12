# Changes

## Backend
- `forms-core/services/scope-resolver.service.ts`: `resolve` now `find`s ALL areas/sectors/groups where the user is leader or co-leader (was `findOne` gated by role slug). Areas -> their sectors; union with directly led sectors; groups = all groups of those sectors union directly led groups; ids deduped. admin/pastor branch unchanged; users leading nothing get an empty scope. `ResolvedScope` shape unchanged.
- `life-groups/life-groups.service.ts`: `findMine` joins sector, area and their leader/co-leader ids (single query) and adds supervised groups; each item gets `relationship` (leader > co_leader > supervisor > member) and `is_supervised`. `toResponse` takes optional extras (relationship only emitted when given, i.e. only `/me`). New private `findSupervisedGroupIds` used by `findOne` so a supervisor sees the roster of a supervised group (also a slug-less supervisor). `findAll` untouched.
- `life-group-analytics/life-group-analytics.service.ts` (`overview`): members universe is now `sectorId IN (...) OR lg.id IN (in-scope groups)` when the scope has both, so a sector leader who also leads a group in another sector counts those members.
## Client (minimum)
- `kmp-mobile/shared/.../domain/model/Church.kt`: `LifeGroup.relationship: String? = null`, `isSupervised: Boolean = false` (`is_supervised`). No Swift change (reads the shared model). Test `LifeGroupRelationshipTest`.
## Docs
- `.ai/features/life-groups.md`, `.ai/apps/backend.md`, `.ai/features/people-and-membership.md`, `.ai/features/mobile-app.md`.

## Consumer audit (ResolvedScope)
| Consumer | Use | Multi-row result |
|---|---|---|
| life-group-reports, form-guests, member-registrations, form-conversions lists | `lifeGroupIds` ANY filter, empty -> 1=0 | OK (now all supervised groups) |
| casa-de-paz-reports / casa-de-paz-analytics | `sectorIds` IN | OK; leader-only/slug-less falls back to own submissions |
| life-group-analytics | `lifeGroupIds` (+ led groups) ; overview users universe | OK; universe fixed for mixed scope |
| life-group-attendance, life-group-tasks (`assertCanAccess*`) | `lifeGroupIds.includes(id)` or leader/co-leader fallback | OK; supervisors of any sector/area can access all supervised groups |
| guests.service, journey-progress.service | area/sector/group ids | OK |
| area/sector-supervisor-reports, multiplications `list` | non-unrestricted -> `1=0` (pre-existing, flagged) | unchanged |
| life-group-studies access | role slug OR co-leader OR grant (not scope) | unchanged, flagged |
| admin-ui life groups page / selectors | `GET /life-groups` (unscoped) | already shows every group to every admin-ui user; no supervisor gap, flagged |

## Behavior notes
- Slug-less leaders/co-leaders (e.g. a co-leader with role `member`) now get the scope of the rows they lead in scope-based lists (previously empty scope, only per-endpoint fallbacks). They can already submit/read these via `@Roles`-independent fallbacks in attendance/tasks; list endpoints guarded only by `ScopeGuard` (reports lists) now show their groups' rows. Intended ("co-leaders get the same scope as leaders", resolver comment).
- Not fixed (flagged): `area/sector-supervisor-reports`, `multiplications` `list` return `1=0` for every non-unrestricted caller; life-group-studies `canPublish` still slug/co-leader based.

## Review fixes (Arnold)
- M1: `casa-de-paz-reports.service.ts` new private `managesSector`: the owner-policy bypass on update/softDelete needs `scope.unrestricted` OR (role slug `area_leader`/`sector_leader` AND sector in scope). Same write authorization as before the row-based scope change. Grep found no other place where scope membership bypasses `assertCanEdit/assertCanDelete` (other services always call the policy).
- M2: kept (product decision). Documented in `.pipeline/spec.md` and `.ai/features/life-groups.md`, listing the affected GETs; flagged as a product question for the PR.
- M3: `scope-resolver.service.ts` rewritten: user+role lookup (id/slug only) and one raw ids-only CTE query (areas -> sectors -> groups) instead of 3-5 hydrating `find`s; admin/pastor 1 query, others 2. Constructor now only needs the User repository. `guests.service` / `journey-progress.service` double resolution kept (their routes have no ScopeGuard, so reusing `req.formScope` is not trivial). Real SQL caught a column-name slip (`life_groups."sectorId"`).
- m1: documented (`members_total` may grow for sector-scoped callers).
- m2: `GET /life-groups/me` omits the roster (`members: null`, `member_count` kept) for supervisor-only rows (not leader/co-leader, not rostered). `/:id` unchanged for supervisors.
- m3: `findSupervisedGroupIds(userId, onlyGroupId?)`; `findOne` passes the requested id.
- Tests: resolver spec reworked (in-memory interpreter of the single query + query economy test), life-groups (roster omission, kept for leader/co-leader/rostered, id restriction), casa-de-paz M1 (slug required; member/life_group_leader with sector row go through policy; admin/pastor unrestricted bypass).
