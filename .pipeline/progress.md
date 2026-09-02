# Progress: Fix admin-ui <-> backend API contract mismatches

## Repos / branches / worktrees
- admin-ui: branch `fix/api-contract-mismatches`, worktree `/Users/jonathalima/Developer/church-worktrees/admin-ui-fix-api-contracts`, cut from `develop` (a082cbd at cut time)
- backend: branch `fix/api-contract-mismatches`, worktree `/Users/jonathalima/Developer/church-worktrees/backend-fix-api-contracts`, cut from `develop` (9710066 at cut time)
- Neither worktree has been pushed yet — no PRs opened yet.

## Stage status
- [x] Branches/worktrees created
- [x] Planning — `.pipeline/spec.md` written (planner subagent failed 3x on transient connection errors; spec written directly by orchestrator using the same investigation the planner would have done, verified against actual worktree source)
- [x] Open question resolved (add email field to member form) — unblocked
- [x] Coder — admin-ui: fixes 1, 3, 4 implemented as separate commits on `fix/api-contract-mismatches` (see `.pipeline/changes.md`). Fix 2 (backend) is out of scope for this repo/agent.
- [x] Tester — all three fixes verified; test results in `.pipeline/test-results.md`
- [x] Reviewer — verdict **NEEDS WORK**, see `.pipeline/review.md`. Fix 3 + Fix 4 correct; Fix 1 has 4 blocking items (member address dropped, completed_courses dropped, orphaned-user partial-failure trap, swallowed API errors).
- [x] Coder round 2 — Fix 1 blocking items (B1-B4) addressed on top of prior commits; see `.pipeline/changes.md`. Fix 3/Fix 4 untouched.
- [ ] PR push / draft PR open

## Notes
- Fix #5 (member-journey life_group_id) turned out to already be fixed on `develop` — no work needed, confirmed by reading source directly.
- Fix #1 (users createMember/updateMember) is blocked on a product decision (see spec.md OPEN QUESTIONS) — the registration form has no email field but backend requires email to create a User.
- Fixes #2 (announcements), #3 (conversions), #4 (auth logout) are unblocked and scoped in spec.md; ready for the coder stage once approved to proceed.
