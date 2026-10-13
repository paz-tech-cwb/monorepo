# Review (Malcolm-style self-review of the diff)

Scope: backend only. Read every changed file.

## Blockers
none.

## Major
none.

## Minor / notes
- [m1] `life-group-analytics.service.ts` overview: unknown `life_group_id` for a NON-unrestricted caller yields 403 (access check first), for unrestricted 404; no existence leak for restricted callers. OK by design.
- [m2] `OverviewQueryDto` makes `/overview` reject unknown query params with 400 (global `forbidNonWhitelisted`). Accepted, documented in changes.md; no known client sends extras.
- [m3] `assertValidMeetingDate` still uses UTC "today" (pre-existing leniency of up to 3h); not in scope.
- [m4] Legacy attendance endpoints also gained `code` in error bodies (shared validators). Backward compatible: `message` strings unchanged, existing tests green.
- [m5] The scoped overview echoes `life_group_id`; mobile DTOs ignore unknown keys (kotlinx `ignoreUnknownKeys` is used by the shared HttpClient; verify when the mobile agent wires the param).

## Strengths
- Real-Postgres tests reproduce the analytics bug against develop's code and prove the fix; authorization matrix (leader, sector supervisor, outsider, admin) covered for the scoped overview.
- Error-code contract is tested at three levels (service, real-pipe controller, real DB) including the "generic 404 has no code" distinction.

Verdict: APPROVE (after CI).
