# Changes: meetings 404 hardening + group-scoped analytics (backend)

## Root cause of the TestFlight "Grupo nao encontrado"
Deploy Backend run 38479306265 (release commit 84f1dd9e) FAILED (SSH waited on `/var/lock/vps-deploy/global.lock`, then `client_loop: send disconnect: Broken pipe`, exit 255). The `/meetings` routes were not live; Nest answered its generic `Cannot GET /api/life-groups/2/meetings/2026-09-08` 404 (no `code`) and the clients map any 404 to "Grupo nao encontrado". The service itself never answers 404 for a leader of an existing group, and a past date without a record is a 200 read-only draft (proved on a real Postgres).

## Backend
- `common/errors/coded-error-body.ts` (new): `codedErrorBody(status, code, message)`.
- Stable `code` on: `group_not_found` (404; meetings + attendance services, analytics overview), `life_group_access_forbidden` (403; `assertCanAccessLifeGroup`, analytics), `invalid_meeting_date_format`, `invalid_meeting_date`, `date_in_future` (400; `assertValidMeetingDate`), `invalid_extra_meeting_param` (400; meetings controller). Messages unchanged. A 404 with no `code` = route missing.
- `life-group-analytics`: `GET /overview?life_group_id=` (new `OverviewQueryDto`); scoped => every figure restricted to the group (members_total = members_in_group = roster; without-group = 0; `life_groups` = [group]); response echoes `life_group_id` (null unscoped). 403 outside access, 404 unknown group (unrestricted caller). Unscoped unchanged.
- Tests: service/controller unit specs, opt-in real-Postgres integration specs (`life-group-meetings.integration.spec.ts` +7, new `life-group-analytics.integration.spec.ts` 10).
- Docs: `.ai/features/life-groups.md` (error-code contract, scoped overview), `.ai/apps/backend.md`, `.ai/features/deployment.md` ("After a failed Deploy Backend").

## Required mobile change (NOT done here; kmp-mobile belongs to another agent)
1. `shared/.../domain/repository/LifeGroupAnalyticsRepository.kt`: `suspend fun getOverview(lifeGroupId: Int? = null): LifeGroupOverview`.
2. `shared/.../data/repository/LifeGroupAnalyticsRepositoryImpl.kt` `getOverview`: `client.get("api/life-group-analytics/overview") { lifeGroupId?.let { parameter("life_group_id", it) } }`. (Optionally add `life_group_id` to `LifeGroupOverviewDto`; it is ignorable.)
3. iOS `Features/LifeGroupAnalytics/LifeGroupAnalyticsViewModel.swift` `loadOverview()`: call `getOverview(lifeGroupId: lifeGroupId)` (the `Int32?` already stored; pass `nil` when not scoped). Android `ui/features/lifegroupanalytics/LifeGroupAnalyticsViewModel.kt` `loadOverview()` (line ~63): same, with the screen's `lifeGroupId` argument. Update the Android VM test mock `getOverview()` -> `getOverview(any())` and the repository test.
4. When scoped (`isScopedToGroup`), hide the "in groups / without group" donut (backend returns `members_total == members_in_group`) and the sector/group filter dropdown (`life_groups` has one item).
5. Error mapping: map 404 to "Grupo nao encontrado" ONLY when the body `code == "group_not_found"`; a 404 without `code` (or 5xx) should show a generic "Servico indisponivel/atualize o app" message. Branch on `code` (`extra_meeting_required`, `date_in_future`, ...), never `message`.
Old clients keep working (param optional, response only gained `life_group_id`).

## Behavior notes / risks
- `overview` now validates its query with the global pipe (`forbidNonWhitelisted`): an unknown query param on `/overview` is a 400 (previously ignored). No client sends one.
- Draft roster for a date without a record is the CURRENT roster (not historical membership).
- `assertValidMeetingDate` compares with the UTC date (pre-existing): between 21:00 and 24:00 Sao Paulo "tomorrow" is still accepted by GET. Not changed.

## Follow-up: history rows open for any date with a record
`GET /meetings/:date` already returned 200 for such dates; now locked by specs (controller + real Postgres): legacy report on a non-regular weekday -> 200 `attendance: null` + populated `report` (`derived` nulls); saved extra attendance opens without the flag; no-record non-regular date stays 400 `extra_meeting_required`; past regular date without record = 200 read-only draft. No production code change.
