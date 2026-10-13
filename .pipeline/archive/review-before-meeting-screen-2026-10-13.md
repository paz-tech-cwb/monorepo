## Review: Meetings API phase 1 (feat/life-group-meetings-api)

Scope: `git diff origin/develop...HEAD` vs `.pipeline/spec.md` and `.pipeline/design-attendance-report-merge.md`. Scoped jest (meetings, attendance, reports): 7 suites / 133 tests green, integration spec skipped (27). Prettier clean on all touched files (the one warning, `forms-core/services/notification-sender.ts`, is untouched by this diff). Existing specs are unmodified (only new spec files added).

### Blockers
None.

### Major Issues
- [M1] Input validation [backend/src/life-group-meetings/dto/upsert-life-group-meeting.dto.ts:113-125] `attendance: []` and `report: []` pass the global pipe (reproduced with GLOBAL_VALIDATION_PIPE_OPTIONS: both return OK). `@ValidateNested` accepts arrays and `@Type` turns them into an array of instances. In the service `[]` is truthy, so `attendance: []` reaches `assertValidEntries(undefined)` (TypeError, 500) and `report: []` reaches the insert with undefined NOT NULL columns (23502, 500). Any authenticated user with group access can trigger it. Fix: add `@IsObject()` (or `@IsNotEmptyObject()`) above `@ValidateNested()` on both `attendance` and `report` (keep `@IsOptional()` so null is still allowed), and add a controller-spec case for `[]` -> 400.

### Minor Issues
- [m1] Concurrency [life-group-meetings.service.ts:252-255] Report-only PUT reads attendance with a plain SELECT. A legacy attendance PUT (no advisory lock) can commit between that read and the report link; the legacy sync saw no linked report, so the new report keeps a stale `committed_members(_present)` snapshot. Narrow window, self-heals on next attendance save. Fix: read it with `lock: { mode: 'pessimistic_read' }` (or re-read after saving the report) in that branch.
- [m2] Edit window bypass [life-group-attendance.service.ts upsertInTransaction / legacy PUT] The legacy `PUT .../attendance/:date` has no window, and with the new hook it also rewrites `committed_*` of linked reports after the 14-day window. This is by design for old app versions (phase 1) but is not stated as a decision; add a line to D1/D6 so phase 4 closes it deliberately.
- [m3] Docs/entity comment [life-group-report.entity.ts:13-19] Comment says synchronize "never tries to create/drop" the DB-only constraints. TypeORM synchronize does drop unknown indexes/FKs (the partial unique index, idx_lgr_attendance, and the FK, which has `createForeignKeyConstraints: false`). Safe because DB_SYNCHRONIZE is false in .env.example, staging and compose default; reword to "must never run with DB_SYNCHRONIZE=true against a real DB".
- [m4] Migration [1796000000000-...ts:17-20] `pg_constraint` existence check matches on `conname` only; add `AND conrelid = 'life_group_reports'::regclass` to avoid a false positive from another table.
- [m5] D9 [attendance assertValidMeetingDate] Future-date check is UTC, so between 21:00 and 24:00 America/Sao_Paulo the next SP day is accepted. Pre-existing attendance rule, accepted as D9; fine for phase 1.

### Verified (no finding)
1. Authorization: both endpoints use the shared `assertCanAccessLifeGroup`, identical to the old attendance rule (unrestricted, scope.lifeGroupIds, coLeader id, leader id fallback, else 403). Supervisors come through scope; plain members and another group's leader are denied; no @Roles, so co-leader with role `member` works. Edit window: Sao Paulo calendar-day strings, deadline = date + 14 inclusive (day 14 ok, 15 denied), only `role.slug === 'admin'` bypasses (pastor bound: D1 is coherent and tested), `can_edit` computed per viewer, `edit_deadline` viewer-independent. Responses are explicitly mapped (report mapper emits `submitted_by` as `{id,name}` only; attendance via the existing `toResponse`); no entity leakage; `@SerializeOptions` correctly set.
2. Transactionality: `pg_advisory_xact_lock(4207, hashtext('group:date'))` is transaction-scoped, taken before any read, so find-then-upsert is serialized per meeting. hashtext is 32-bit, so a collision only over-serializes two meetings (no correctness impact). Behaves correctly with or without the unique index; a 23505 from a lock-less legacy writer is replayed once then 409 (rolled-back transaction is abandoned before replay). Lock order is advisory lock then attendance then report on both paths; the legacy PUT also goes attendance then linked reports, so no inverse ordering and no deadlock path found. Audit rows join the trx via the new optional `manager` param, so rollback removes them (integration test covers it).
3. Extraction refactor: `upsertInTransaction` body is a line-for-line move of the old transaction body; validation (`assertValidEntries`), roster/weekday rules, error messages and response (`toResponse(loaded)`) are unchanged, and the snapshot re-sync runs inside the same trx. Old PUT still audits through the non-trx repo exactly as before. Visible changes for old clients: extra indexed SELECT per PUT and audit rows for re-synced linked reports (none exist until the new API is used). D6 (legacy POST duplicate -> 409 only when index exists; PATCH not re-syncing) is acceptable and additive. `@Optional()` on the snapshot service is a silent-skip risk, but both modules provide it (LifeGroupAttendanceModule providers+exports).
4. Migration: every step idempotent; never deletes/updates reports; findings table rebuilt each run (only its own rows are deleted); unique index created only when clean; FK ON DELETE SET NULL; down() symmetric. Production: ALTER/FK/CREATE UNIQUE INDEX take brief locks on a small table (non-CONCURRENTLY is acceptable); 'each' mode means a failure leaves earlier migrations committed but this one atomic. `gen_random_uuid()` and `hashtext` work on PG16 and PG17.
5. DTO: caps and @Min/@Max present (see M1 for the array hole); extraneous/derived keys (`date`, `area_id`, `committed_*`) are stripped by excludeExtraneousValues and cannot be client-set; `committed_*`, area and sector come from attendance/group.
6. 422 (`group_has_no_sector` / `sector_has_no_area`) is checked before any write, attendance-only still saves; 409 `attendance_required` thrown inside the trx so nothing is persisted.
7. Tests: the opt-in integration spec is skipped unless MEETINGS_PG_PORT is set (`describe.skip`), so default CI is safe. It covers real-PG parallel PUTs with and without the index, legacy-vs-meetings race, rollback via a DB error and a failing audit insert, ON DELETE SET NULL, dirty-DB duplicates; the FakeEntityManager unit tests only prove logic and rollback of the fake, so the integration spec is what actually proves locking (make sure it was run, results are in test-results.md). Decisions D1-D9 are sensible and match the code.

### Strengths
- Single shared access util prevents drift between attendance and meetings (life-group-access.util.ts).
- Snapshot service hooked into the shared upsert keeps old-app attendance edits consistent with linked reports in one trx.
- Migration is defensive and non-destructive; entity avoids declaring the partial index.

### Verdict: REQUEST CHANGES (one major, M1: a 2-line DTO fix; everything else can ship as-is or be noted). SHIP after M1 is fixed and tested.

## Round 2 (extra meeting flag) — commit 123e5f0e vs 3dc342a

Checks run (read-only): jest on life-group-attendance/meetings/analytics/tasks = 15 suites pass, 254 tests pass, 34 skipped (the DB-backed integration spec is skipped here, so the roster SQL and the advisory locks were NOT exercised against real Postgres); eslint clean on changed files; prettier --check clean.

### Blockers
- none

### Major
- [M1] Tests/SQL: the new eligibility SQL (life-group-task-roster.service.ts:94-103) and the 4208 cap are only verified by mocks/fake EM; the real-DB integration spec is skipped in this run. Run `life-group-meetings.integration.spec.ts` + a roster query against Postgres once before merge (at minimum: 4 extras in one week -> only earliest counts; non-extra data counts unchanged).

### Minor
- [m1] GET param parsing (life-group-meetings.controller.ts, `extraMeeting === 'true'`): `?extra_meeting=TRUE`, `1`, `yes` or `abc` silently become false and the user gets `extra_meeting_required` instead of a 400 on the param. Fix: accept only 'true'/'false', else 400 (or ParseBoolPipe-like).
- [m2] Draft GET with extra_meeting=true does not check the weekly cap, so mobile can preview a draft that PUT then refuses with 409. Acceptable (documented as preview); optionally return a hint.
- [m3] Eligibility "earliest extra of week" is date-ordered, not creation-ordered: back-filling an earlier-dated extra later moves the counted extra and can lower a member's count retroactively. Document, or count by created_at if undesired.
- [m4] roster SQL uses `date_trunc('week', date)`: on a `date` it casts to timestamptz (session TZ) but both sides use the same cast so grouping is consistent and Monday-based like isoWeekRange; fine, but compare against `isoWeekRange` in a test with a week spanning month/year (e.g. 2026-12-28..2027-01-03) to lock the equivalence. meeting-day.util.spec covers isoWeekRange only on the util side.
- [m5] `is_extra` is not exposed in the legacy attendance GET/PUT responses (intentional per docs), but a legacy PUT can edit an extra record; fine and documented.

### Verified correct
- Weekday logic: resolveNewMeetingIsExtra uses pure calendar math (weekdayOfDateString), no TZ drift; matrix is right (fixed-day+other day needs flag; flag on regular day -> 400; flag on no-fixed-day group -> 400; omitted on regular -> false). Legacy path (`extra` undefined) still calls assertMatchesMeetingDay and forces isExtra=false.
- Immutability: for an existing record the flag is only compared, never written; omitted keeps stored value; contradicting -> 400 extra_meeting_immutable in both directions. Report-only PUT ignores flag.
- Cap race: lock order is always 4207 (group,date) then 4208 (group,ISO-week Monday); no code path takes 4208 first or 4207 after, so no deadlock; both are xact-level so held until commit, and the count runs after the lock in READ COMMITTED so it sees prior commits. Parallel same-date requests are serialized by 4207 and the unique-index 23505 handler. hashtext collision only causes harmless extra serialization. Cap applies only on creation; editing never blocked. Counting happens before the insert so `>= 3` is the right comparison.
- Eligibility SQL: non-extra rows short-circuit logically (`is_extra = false OR ...`), default false on all existing rows, so counts for pre-existing data are identical. Correlated subquery runs only for extra rows, limited to one group/week, on the (life_group_id, meeting_date) unique index: negligible cost. Unique (group,date) means `meeting_date IN` identifies the one record, no tie issue.
- Migration 1796000000001: ADD COLUMN IF NOT EXISTS ... NOT NULL DEFAULT false (metadata-only on PG11+, no rewrite), down uses DROP COLUMN IF EXISTS: idempotent and reversible. Entity default matches.
- Analytics: additive field, `COUNT(*) FILTER` correct, extras included in existing totals (documented).
- Docs (.ai/features/life-groups.md) accurately describe codes, cap, lock order, consumers and the PR #98 guidance.

### Verdict: SHIP (run the DB-backed integration spec once as a pre-merge sanity; m1 is a cheap fix worth doing)
