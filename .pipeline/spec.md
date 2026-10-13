# Spec: meetings 404 hardening + group-scoped analytics (backend)

Branch: fix/meetings-404-analytics-scope (from origin/develop). Backend only; kmp-mobile is owned by another agent.

## Task 1: GET /life-groups/:id/meetings/:date 404 on TestFlight
Evidence: Deploy Backend run 38479306265 (release commit 84f1dd9e) failed (SSH step waited for /var/lock/vps-deploy/global.lock, then `client_loop: send disconnect: Broken pipe`, exit 255). New /meetings routes + migrations 1796000000000/1 were most likely not deployed; Nest answers `{"message":"Cannot GET /api/life-groups/2/meetings/2026-09-08","error":"Not Found","statusCode":404}` which the clients map to "Grupo nao encontrado".
Plan:
- Enumerate every 404 source and prove (real app + real Postgres): route missing (generic body, no `code`), service `NotFoundException` (group id unknown only).
- Stable machine-readable `code` on every error of the meetings GET (and attendance GET sharing the validators): `group_not_found` 404, `life_group_access_forbidden` 403, `invalid_meeting_date_format` / `invalid_meeting_date` / `date_in_future` 400, `invalid_extra_meeting_param` 400, existing `extra_meeting_required` etc. Messages unchanged.
- Past date, no record, outside the edit window, leader: 200 draft, can_edit=false, is_draft=true, edit_deadline in the past (tests).
- Document: draft roster of a past date = CURRENT roster.
- Document how migrations run on deploy (container CMD start:prod:migrate) and an "after a failed Deploy Backend" checklist.

## Task 2: analytics scoped to the selected group
Root cause: `GET /life-group-analytics/overview` takes no filter, clients call it without params, so members_in_group/members_total (donut "in groups / without group") aggregate the whole users table. attendance/distribution already accept `life_group_id`.
Plan: overview accepts `life_group_id`; when present (and authorized via resolveLifeGroupIds, 403 otherwise) every figure is restricted to that group: life_groups=[group], members_total = members_in_group = group roster, so without-group = 0, groups_by_sector = that group's sector, avg = roster size, kids = group's kids. Response echoes `life_group_id`. Unscoped unchanged. Client change documented for the mobile agent.

## Validation
build, scoped jest, full jest vs 6 baseline failures, eslint changed files, prettier, real Postgres (integration specs), draft PR to develop, CI watch, self-review (.pipeline/review.md).
