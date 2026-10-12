# Spec: Supervisors see every life group they supervise

## Request
Area and sector leaders (and co-leaders) must see ALL life groups under their supervision wherever a life group list or scope is used. No widening for ordinary members; admin/pastor unchanged. `GET /life-groups/me` must include supervised groups and say how the viewer relates to each. Backend only plus the minimum client change (PR #92 home card depends on `/life-groups/me`).

## `.ai/` context read
`CLAUDE.md`, `.ai/README.md`, `features/life-groups.md`, `apps/backend.md`, `backend/CLAUDE.md`.

## Verified findings (code, not assumption)
1. CONFIRMED. `ScopeResolverService.resolve` used `findOne` for area/sector/group (first row only) and gated on the role slug (`area_leader` / `sector_leader` / `life_group_leader`): one slug = one branch, so a user leading several areas/sectors/groups got only the first, and a leader/co-leader of a row without the matching slug got an empty scope. Roles are assigned manually (`PATCH users/:id/role`, admin only); creating/editing an Area/Sector/LifeGroup leader does NOT change the leader's role (areas/sectors/life-groups services never touch roles). So row-without-slug is a real state (e.g. co-leaders have no slug at all, see attendance/analytics fallbacks).
2. CONFIRMED. `LifeGroupsService.findMine` returned only groups where the viewer is leader, co-leader or roster member.
3. CONFIRMED, left as is. `findAll` (`GET /life-groups`) returns every group to any authenticated user. Mobile uses it for discovery (`ChurchRepositoryImpl.getLifeGroups`, search by `q`/`search`); admin-ui uses it for the life groups page, selectors and notifications. Intended for discovery; flagged as product question.  Not changed at all (no extra query on the discovery endpoint).
4. Consumers of `ResolvedScope` audited (see changes.md): all use `scope.lifeGroupIds/sectorIds/areaIds` as sets, so they work with multi-valued scope once the resolver returns it. Guards (`@Roles`) are unchanged, so widening the resolver cannot open role-gated endpoints.

## Decisions
- Scope keys off the real `leader_id`/`co_leader_id` rows, not the role slug. Rationale: the code comment already states that intent; slug gating produced the empty-scope bug; access is granted only for rows the user actually leads/co-leads, and endpoint-level `@Roles` guards still apply. Admin/pastor keep the unrestricted branch (checked first). A user with no leader row (member, guest, discipler, or any slug) gets an empty scope exactly as before.
- Union of everything regardless of slug: areas led/co-led -> their sectors; sectors led/co-led directly; groups = all groups of those sectors + groups led/co-led directly.
- `areaIds` = areas led/co-led; `sectorIds` = union (areas' sectors + directly led sectors); `lifeGroupIds` = union. `ResolvedScope` shape unchanged.
- `GET /life-groups/me`: add supervised groups through one query joining the group's sector, area and their leaders/co-leaders. Add `relationship` (`leader` | `co_leader` | `supervisor` | `member`, precedence in that order) and `is_supervised` (true when the viewer supervises the group via area/sector, regardless of precedence). Membership via roster is `member`. Ordering unchanged (name asc).
- Supervisors can see the roster of supervised groups (`members`) in `/me` and `/:id` (one extra id query in `/:id`). `GET /life-groups` unchanged. Plain members: unchanged.
- `relationship`/`is_supervised` only in `/me` (other endpoints unchanged).

## Client (minimum)
Kotlin `LifeGroup` (shared) gets `relationship: String? = null` and `isSupervised: Boolean = false` (`is_supervised`), defaulted, so existing constructors and old backends keep working. Swift reads the shared Kotlin model: no Swift change. Kotlin `ignoreUnknownKeys = true` already protects older app builds from the new fields. PR #92 does not touch `Church.kt` (no conflict).

## Home card recommendation (product question)
`buildHomeLifeGroupCards` (PR #92) orders leader/co-leader first then by name, cap 3 + "Ver todos (N)". Without a change, supervised groups sort alphabetically after leadership groups: a supervisor of 100 groups sees their own groups first, then 3 - n alphabetical supervised ones, and "Ver todos (N)". Recommended rank: leader > co_leader > member > supervisor, cap unchanged at 3, and when the supervisor has more than 3 groups show ONE summary card ("Você supervisiona N grupos") instead of alphabetical supervised cards. Follow-up on #92 (not in this branch): 3 lines in `buildHomeLifeGroupCards` using `relationship`.

## Validation plan
Scoped jest (scope resolver, life-groups service, consumers), full jest vs baseline 6 failing suites, `npm run build`, scoped eslint/prettier, throwaway Postgres for the `findMine` query, Kotlin model compile not possible without JDK check (see test-results).
