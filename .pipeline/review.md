## Review: supervisor life group visibility (Malcolm)

Scoped jest (forms-core, life-groups, life-group-analytics): 58/59 pass; the one failure is notification-sender.spec (file untouched, baseline). Prettier only flags notification-sender.ts (untouched).

### Blockers
None.

### Major
- [M1] security/authz — casa-de-paz-reports/casa-de-paz-reports.service.ts:241,298 (+ controller PATCH/DELETE :54,:68, no @Roles) — `managesSector = scope.unrestricted || scope.sectorIds.includes(m.sectorId)` skips `policy.assertCanEdit/Delete`. sectorIds was slug-gated before (only area_leader/sector_leader slugs); now ANY user holding a sector/area leader or co-leader row (slug member, life_group_leader, none) can edit/soft-delete every report in those sectors. This is a write-authorization widening, not just visibility. Fix: either accept explicitly (co-leader of sector = manager, document it in spec/.ai) or keep the bypass gated on slug in (area_leader, sector_leader) plus the row check. Add a test either way.
- [M2] security/behavior — all `ScopeGuard`-only read endpoints (forms/member-registrations, form-guests, form-conversions, life-group-reports GET list/:id/:id/audit, life-group-analytics, casa-de-paz-reports GET). These have no RolesGuard on GET, so empty scope used to be an implicit role check (1=0). Role-less leaders/co-leaders (slug member/guest) now receive PII lists (registrations, guests, conversions) for their groups and sectors. Plausibly intended (spec says co-leaders have no slug), but it is a product/privacy decision that the spec only covers as "@Roles guards unchanged". Fix: state it in the spec/.ai, or add RolesGuard to those GETs. Also confirm sector/area-supervisor-reports lists (scope.unrestricted else 1=0) are unaffected: they are, no change.
- [M3] performance — scope-resolver.service.ts:28-83. Runs on EVERY ScopeGuard request, plus again in guests.service.ts:38 and journey-progress.service.ts:63. Plain members now cost 1 (user+role) + 3 parallel queries (was 1); area leaders cost 1+3+2 sequential, and `find` hydrates full Area/Sector/LifeGroup entities (with joined leader/coLeader from the relation where) only to read `.id`. Fix: select only id (`select: {id: true}` or a single raw UNION/CTE query), and short-circuit the 3 queries to one query. Optionally cache per request (guard already stores req.formScope; guests/journey could reuse it instead of re-resolving).

### Minor
- [m1] correctness — life-group-analytics.service.ts:407-414. For sector-scoped callers the members universe is now `u.sectorId IN sectors OR lg.id IN lifeGroupIds`, and lifeGroupIds already contains every group of those sectors, so users who sit in a scoped group but have a different/null sectorId are now counted (members_total can grow vs before). Probably more correct, but is a behavior change not mentioned in changes/spec; the new test asserts only the SQL string. Note it.
- [m2] payload/PII — life-groups.service.ts findMine + toResponse. A supervisor of N groups gets N full rosters (id, name, email) in `/me`, and the home card needs none of them; with area-wide scope this can be hundreds of rows x members. Spec decision says rosters are visible to supervisors (consistent with leaders/admin, acceptable), but consider omitting `members` in `/me` for supervisor-only rows (keep in `/:id`) to cut payload and email exposure.
- [m3] performance — life-groups.service.ts:352 `findOne` now runs `findSupervisedGroupIds` (joins sector/area for ALL groups the viewer supervises) just to test one id, even for plain members. Fix: `where lg.id = :id` in that query (or only run when not leader/co-leader/member/admin).
- [m4] tests — findMine/findSupervisedGroupIds are tested via mocked QueryBuilder (SQL validated once manually per test-results, not repeatable); scope-resolver spec uses an in-memory fake that interprets TypeORM where shapes. Nothing guards the real SQL (joins, OR precedence with the subquery, no member_count inflation). Add a pg-backed/e2e test if the repo has one. No test for the M1 case (member-slug sector co-leader editing a report).
- [m5] consistency — findMine precedence is leader > co_leader > supervisor > member (code, .ai, spec decision) but the spec's home-card suggestion ranks member above supervisor; fine, different concerns, just make sure PR #92 follow-up doesn't conflate `relationship` ordering with display ordering.
- [m6] robustness — `sector?.area?.leader` cast in findMine relies on partial-select hydration of leftJoin+addSelect ids; fine today, brittle if the entity/relations are renamed. Comment is present for the query, not for the cast.

### Verified OK (no finding)
- findMine: dedupe by TypeORM getMany; roster join is unfiltered so member_count is not inflated; sector/area leader joins are many-to-one so no row multiplication; orWhere chain is flat (correct OR); plain member not widened; supervision via area->sector->group and direct sector, co-leaders of both covered; `is_supervised` true even if leader wins.
- Consumer audit: attendance, task-access, guests, journey, form lists, casa-de-paz-analytics, life-group-analytics all treat scope as sets and handle empty (1=0 / early return); guests/journey/attendance/tasks are role-agnostic or already fall back to leader rows, so only widening for multi-row leaders. admin/pastor unrestricted unchanged. No consumer treats empty scope as a role check except the ones in M1/M2.
- Contract: new fields additive/optional in `/me` only; Kotlin `relationship: String? = null`, `isSupervised = false` default, ignoreUnknownKeys covers old builds; Swift reads the shared model; admin-ui uses `/life-groups`, unchanged.
- Docs match the code (row-based scope, precedence, /me only).

### Strengths
- Resolver now matches its own stated intent and fixes multi-row leaders; no extra queries on the discovery `GET /life-groups`.
- Clear comments on why slug-less leaders exist; analytics union handled with a test.

### Verdict: APPROVE WITH CHANGES (not SHIP as is)
Resolve M1 (decide + gate or document + test) and record the M2 decision; M3 is cheap (select ids only) and should be done before merge since the guard runs on every request. Minors can follow.
