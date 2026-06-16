# Ministry-Based Form Access (Atmosfera / service-reports)

## Problem

`service-reports` ("Relatório do Culto") is the form Atmosfera ministry uses to log
service reports. Access today is gated purely by the global role enum
(`@Roles('admin','pastor','area_leader','sector_leader','life_group_leader')` on
`POST /forms/service-reports`, and a static role list in
`forms-catalog.service.ts`).

Atmosfera is not a global role — a person can be a member or leader of the
Atmosfera ministry (or one of its teams) while holding the global role
`member`. Today such a person is locked out of the form entirely, even though
they're on the team that's supposed to fill it in.

Desired behavior:
- Admin/pastor: always full access (read + write), unconditionally.
- Ministry leader or co-leader (at ministry level OR team level): can view the
  submissions list (read) — same as today's leader-style access in admin-ui.
- Any other ministry/team member ("inserted" into the ministry): can submit
  new reports (write), but not view the list.
- Must work identically in admin-ui (already built) and KMP (Android + iOS),
  which currently has no submissions list screen at all.

## Scope

- Fixes `service-reports` end-to-end (backend access rules, KMP list UI).
- Introduces a reusable mechanism (`ministry-access` module + form→ministry
  map) so a future ministry-linked form can register with one config entry,
  without touching the existing hierarchy-based (`forms-core`/`ScopeResolverService`)
  logic used by the other 7 forms (member-registrations, conversions,
  life-group-reports, sector/area-supervisor-reports, multiplications,
  form-guests).
- Admin-ui requires no structural changes — it already keys UI off
  `can_read`/`can_write` from the forms catalog.

## Backend

### New module: `ministry-access`

`MinistryAccessService.resolve(userId, ministrySlug): Promise<{ isLeader: boolean; isMember: boolean }>`

- `isLeader = true` if the user is `leader` or `coLeader` of the `Ministry`
  row matching `ministrySlug`, OR `leader`/`coLeader` of any `MinistryTeam`
  under that ministry.
- `isMember = true` if the user is in `ministry.members`, or in
  `team.members` for any team under that ministry.
- Admin/pastor are NOT special-cased inside this service — that override is
  applied by callers (forms-catalog, controller), keeping this service a pure
  ministry-membership lookup.

### Form → ministry map

A single exported constant, e.g.:

```ts
export const MINISTRY_LINKED_FORMS: Record<string, string> = {
  'service-reports': 'atmosfera',
};
```

This is the one place a future ministry-linked form registers itself.

### `MinistryFormGuard`

Guard parameterized by ministry slug (via a decorator, e.g.
`@MinistryForm('atmosfera')`), attaches `req.ministryAccess = { isLeader, isMember }`
to the request. Does not block by itself — controllers decide what to require
per-route (e.g. list requires `isLeader`, create requires `isLeader || isMember`).
Admin/pastor bypass: the guard short-circuits to
`{ isLeader: true, isMember: true }` when `req.user.role.slug` is `admin` or
`pastor`, without querying ministry tables.

### `forms-catalog.service.ts` (signature change)

`listForRole(roleSlug)` currently receives only the role string and is
synchronous; the controller (`forms-catalog.controller.ts`) only passes
`roleSlug`. To compute ministry flags it needs the user id and must do async
lookups. Change to:

```ts
async listForRole(actor: { id: number; roleSlug: string }): Promise<FormCatalogEntry[]>
```

Update `forms-catalog.controller.ts` to pass `{ id: req.user.id, roleSlug }`.

For any slug present in `MINISTRY_LINKED_FORMS`, replace the static
`write`/`read` role-array check with a call to `MinistryAccessService`:

```
can_write = isAdminOrPastor || isMember || isLeader
can_read  = isAdminOrPastor || isLeader
```

Other form definitions keep their existing static role arrays — unchanged.

### `service-reports.controller.ts` + `service-reports.service.ts`

**Critical: do NOT reuse the existing life-group `formScope` filter for this
form.** The `list()` method in `service-reports.service.ts` currently filters
by `f.life_group_id` — a column that **does not exist** on the `ServiceReport`
entity (the entity is keyed to `atmosphere_team_id` / `submitted_by_id`, with
no life-group relation). For any non-admin/pastor actor, `ScopeResolverService`
returns `lifeGroupIds: []`, so the query falls into the `else` branch (`1=0`)
and returns zero rows. Layering the new ministry guard on top of this would let
an Atmosfera leader pass the guard but still see an empty list. The two layers
contradict each other.

Resolution — ministry-linked forms use ministry-based listing, not
hierarchy/life-group scoping:

- `service-reports.service.ts`: replace the `ResolvedScope`-based `list(scope)`
  with `listAll()` (returns all non-deleted service-report submissions ordered
  by `created_at DESC`, with `submittedBy` + `atmosphereTeam` joins). There is
  a single Atmosfera ministry, so "all submissions" is the correct ministry
  scope for its leaders; no per-team row filtering is required now. Drop the
  dead `f.life_group_id` query and the `ScopeResolverService` import from this
  service.
- `service-reports.controller.ts`:
  - Remove `ScopeGuard` from this controller (it only existed to populate
    `req.formScope`, which is no longer used here).
  - `POST` (create): replace `@Roles(...)` with `@MinistryForm('atmosfera')` +
    in-handler check
    `if (!req.ministryAccess.isMember && !req.ministryAccess.isLeader) throw Forbidden`.
  - `GET` (list): add `@MinistryForm('atmosfera')` + check
    `if (!req.ministryAccess.isLeader) throw Forbidden`, then call `listAll()`.
  - `GET :id` / `:id/audit`: gate behind `isLeader` (a member who can only
    submit should not read arbitrary submissions). Admin/pastor pass via the
    guard bypass.
  - `PATCH`/`DELETE`: unchanged (`FormSubmissionPolicyService` already covers
    edit/delete window + admin override).

Note: the other 7 forms keep `ScopeGuard` and the `ResolvedScope` filtering
untouched — this change is isolated to the service-reports controller/service.

## Admin-ui

No code change expected. `formularios-hub.tsx` and
`[slug]/form-list-view.tsx` already branch on `can_read`/`can_write` from
`useFormsCatalog()`. Once the backend computes correct flags for
service-reports, members see "Novo registro" only, leaders see the table.
Verify in the browser after the backend change (login as an Atmosfera team
member with global role `member`, and as a team leader).

## KMP (Android + iOS)

### `:shared`

- Add to `FormsRepository`: `suspend fun getServiceReportSubmissions(): List<ServiceReportSubmission>`,
  backed by `GET /forms/service-reports`.
- New serializable model `ServiceReportSubmission` mirroring the entity's
  response fields (id, date, report_type, period, atmosphere_team_id,
  atmosphere_responsible, tadel_adults, tadel_kids, vehicles_*, volunteers_*,
  notes, submitted_by, created_at) — read-only, separate from the existing
  write-only `ServiceReportForm` payload type.
- `FormCatalogItem.canRead`/`canWrite` (already present) drive navigation —
  no model changes needed there.

### Android

- `FormulariosScreen` card tap: if `canRead` → navigate to new
  `FormSubmissionsListScreen` (new route `Screen.FormSubmissionsList`); else
  (only `canWrite`) → existing `FormDetailScreen` (add) route, as today.
  If both → list screen, with a "+" FAB navigating into the add form.
- New `FormSubmissionsListScreen.kt` + `FormSubmissionsListViewModel.kt`
  (`UiState` with `loading/error/empty/data`, following the existing
  `FormulariosUiState` pattern) — simple list of rows (date, period,
  responsible, adults/kids count), tap row → read-only detail (reuse a
  simple `FormSubmissionDetailScreen` showing key/value pairs, no edit).
- Scope this list UI to `service-reports` only for now — not a generic
  dynamic-column table like admin-ui's `_columns.tsx`.

### iOS

- Same navigation split in `FormulariosView.swift`: `canRead` → new
  `FormSubmissionsListView.swift` (`@Observable @MainActor` view model per
  `kmp-mobile` conventions); `canWrite`-only → existing `FormDetailView`.
- Consumes the same `:shared` `getServiceReportSubmissions()` method — no
  duplicate networking logic.

## Testing

- Backend: `ministry-access.service.spec.ts` covering the leader/member/
  neither matrix at both ministry and team level; updated
  `forms-catalog.service.spec.ts` for service-reports flags; controller-level
  test (or extend existing) confirming a `member`-role ministry member can
  POST but not GET, and a team leader can GET. Update/replace the existing
  `list(scope)` test to cover `listAll()` (the life-group-scoped variant is
  removed).
- KMP: `FormSubmissionsListViewModel` test for loading/error/empty/data
  states; extend `FormDetailViewModel` test coverage to confirm a
  ministry-member-only (global role `member`) submission succeeds.
- Manual: admin-ui browser check for both a ministry member and a team
  leader account, per the Admin-ui section above.
