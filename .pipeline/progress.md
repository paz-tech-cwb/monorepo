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
- [x] Tester round 2 — All round 2 fixes verified: B1 (address wired through with all-or-nothing validation), B2 (completed_courses wired through as string[]), B3 (orphaned-user trap closed, partial failure handled gracefully), B4 (ApiError-aware error handling). TypeScript + ESLint pass. Test results in `.pipeline/test-results.md` Round 2 section. **VERDICT: PASS ✓**
- [x] Reviewer round 2 — verdict **NEEDS WORK** (one item), see `.pipeline/review.md` Round 2 section. B1-B4 all genuinely resolved and independently verified against source + backend DTOs; `package-lock.json` not committed; only baseline tsc errors. **New regression R2-B1**: `buildAddressRequest()` counts `country` in its all-or-nothing check, but `EMPTY_ADDRESS` pre-fills `country: "Brasil"`, so a pristine form can never return `undefined` — address is now de-facto mandatory and the operator gets an impossible-to-satisfy error. ~3-line fix in `member-registration-form.tsx`.
- [x] Coder round 3 — fix R2-B1 only: `buildAddressRequest()` empty/partial/complete probe no
  longer includes `country` (pre-filled `"Brasil"` by `EMPTY_ADDRESS`), so a pristine address
  block is correctly treated as empty instead of blocking submission; payload sent when filled
  still includes `country`. `tsc --noEmit` and `eslint` clean for the changed file. See
  `.pipeline/changes.md` Round 3 section.
- [ ] Tester round 3 — pending
- [ ] PR push / draft PR open

## Notes
- Fix #5 (member-journey life_group_id) turned out to already be fixed on `develop` — no work needed, confirmed by reading source directly.
- Fix #1 (users createMember/updateMember) is blocked on a product decision (see spec.md OPEN QUESTIONS) — the registration form has no email field but backend requires email to create a User.
- Fixes #2 (announcements), #3 (conversions), #4 (auth logout) are unblocked and scoped in spec.md; ready for the coder stage once approved to proceed.
