# Progress: Fix admin-ui <-> backend API contract mismatches

## Repos / branches / worktrees
- admin-ui: branch `fix/api-contract-mismatches`, worktree `/Users/jonathalima/Developer/church-worktrees/admin-ui-fix-api-contracts`, cut from `develop` (a082cbd at cut time)
- backend: branch `fix/api-contract-mismatches`, worktree `/Users/jonathalima/Developer/church-worktrees/backend-fix-api-contracts`, cut from `develop` (9710066 at cut time)
- Neither worktree has been pushed yet — no PRs opened yet.

## Stage status
- [x] Branches/worktrees created
- [x] Planning — `.pipeline/spec.md` written (planner subagent failed 3x on transient connection errors; spec written directly by orchestrator using the same investigation the planner would have done, verified against actual worktree source)
- [ ] **STOPPED: spec.md has an OPEN QUESTION (fix #1 email requirement gap) — awaiting user answer before proceeding to coder stage**
- [ ] Coder (fixes 2, 3, 4 can start independently of the fix #1 answer)
- [ ] Tester
- [ ] Reviewer
- [ ] PR push / draft PR open

## Notes
- Fix #5 (member-journey life_group_id) turned out to already be fixed on `develop` — no work needed, confirmed by reading source directly.
- Fix #1 (users createMember/updateMember) is blocked on a product decision (see spec.md OPEN QUESTIONS) — the registration form has no email field but backend requires email to create a User.
- Fixes #2 (announcements), #3 (conversions), #4 (auth logout) are unblocked and scoped in spec.md; ready for the coder stage once approved to proceed.
