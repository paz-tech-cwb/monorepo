# Progress: Fix admin-ui <-> backend API contract mismatches

## Repos / branches / worktrees
- admin-ui: branch `fix/api-contract-mismatches`, worktree `/Users/jonathalima/Developer/church-worktrees/admin-ui-fix-api-contracts`, cut from `develop` (a082cbd at cut time)
- backend: branch `fix/api-contract-mismatches`, worktree `/Users/jonathalima/Developer/church-worktrees/backend-fix-api-contracts`, cut from `develop` (9710066 at cut time)
- Neither worktree has been pushed yet — no PRs opened yet.

## Stage status
- [x] Branches/worktrees created
- [x] Planning — `.pipeline/spec.md` written (planner subagent failed 3x on transient connection errors; spec written directly by orchestrator using the same investigation the planner would have done, verified against actual worktree source)
- [x] OPEN QUESTIONS resolved (fix #1 email requirement gap answered by user decision — see spec.md)
- [x] Coder — backend repo: Fix 2 (announcements) implemented on `fix/api-contract-mismatches` (this worktree). See `.pipeline/changes.md` for details. `npm run lint` and `npx jest announcements` pass for changed files (pre-existing unrelated lint/test issues elsewhere in the repo left untouched).
- [x] Tester — All Fix 2 requirements verified passing. See `.pipeline/test-results.md` for full test suite results (announcements tests 3/3 pass, TypeScript clean, no new lint errors; pre-existing test failures in unrelated domains isolated and unchanged).
- [x] Reviewer — **NEEDS WORK**. See `.pipeline/review.md`. Blocking: (B1) the entity-level `@Expose({name})` renames also change the `GET /home` payload, which the KMP mobile app parses with camelCase keys — announcement banners silently disappear on mobile; (B2) tests do not cover the snake_case mapping, optional `action_url`, or the auth guard. Non-blocking items N1-N7 listed in the review.
- [x] Coder round 2 — B1 and B2 fixed on `fix/api-contract-mismatches` (new commit, `b769a40` untouched). See `.pipeline/changes.md` "Coder round 2" section. `AnnouncementsController` now transforms entities to a new `AnnouncementResponseDto` (snake_case wire keys) at the controller layer only; the entity itself is unrenamed so `HomeService`/`HomeController` output for announcements is back to camelCase, matching KMP's `HomeRepositoryImpl.kt` expectations (verified empirically). Added real coverage for snake_case serialization, optional `action_url` validation, and the JWT guard registration. `npx eslint`, `npx tsc --noEmit`, `npx jest announcements` all clean (pre-existing unrelated failures elsewhere confirmed unchanged via `git stash` diff).
- [ ] PR push / draft PR open

## Notes
- Fix #5 (member-journey life_group_id) turned out to already be fixed on `develop` — no work needed, confirmed by reading source directly.
- Fix #1 (users createMember/updateMember) is blocked on a product decision (see spec.md OPEN QUESTIONS) — the registration form has no email field but backend requires email to create a User.
- Fixes #2 (announcements), #3 (conversions), #4 (auth logout) are unblocked and scoped in spec.md; ready for the coder stage once approved to proceed.
