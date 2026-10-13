# Tester Results

Status: PASS with local DB caveat

Date: 2026-07-17

## Summary

Backend build passed. The new production migration command resolves to the compiled TypeORM data source and starts migration execution. It failed locally only because no PostgreSQL server was listening on localhost:5432, which is expected in this session and not a command wiring failure.

## Commands and Results

### Backend build

Command:

```bash
cd backend && npm run build
```

Result: PASS

```text
> backend@0.0.1 build
> nest build
```

### Production migration command wiring

Command:

```bash
cd backend && npm run migration:run:prod
```

Result: EXPECTED LOCAL FAILURE — DB unavailable

```text
> backend@0.0.1 migration:run:prod
> npm run typeorm:prod -- migration:run

> backend@0.0.1 typeorm:prod
> npx typeorm -d dist/db/data-source.js migration:run

Error during migration run:
AggregateError [ECONNREFUSED]: connect ECONNREFUSED ::1:5432 / 127.0.0.1:5432
```

This verifies the script invokes `dist/db/data-source.js` without rebuilding. The local environment did not have Postgres running on `localhost:5432`.

## Commands not run

- Full `npm run test`: not run because the change is deployment command wiring, not backend business logic.
- Live production migration: not run from this local session to avoid directly mutating production data outside the deployment pipeline.

---

## Phase B1 results

Environment: no Node/npm installed on this machine and `backend/node_modules` absent, so `npx jest`, `npm run build` and `npx eslint` could NOT be run (`command not found: npx`).

Substitute validation (VS Code's bundled TypeScript via `ELECTRON_RUN_AS_NODE`, transpile-only + minimal jest shim, scratch script outside repo):
- Syntax diagnostics: 0 across the engine, resolver, both specs and group-setting entity.
- Spec results: 18 passed, 0 failed (6 resolver, 12 engine).
- NOT verified: full type-check/`nest build`, eslint/prettier, real jest run. Re-run in CI/local: `cd backend && npm ci && npx jest src/life-group-tasks && npm run build && npx eslint src/life-group-tasks src/configs/orm.config.ts database/migrations/179590000000{3,4}-*.ts`.

---

## Phase B2 results

Environment: no Node/npm, no `backend/node_modules` (same as B1), so these could NOT run: `npx jest`, `npm run build` (tsc type-check), `npx eslint`/prettier.

Substitute validation (VS Code bundled TypeScript via `ELECTRON_RUN_AS_NODE=1 .../Contents/MacOS/Code`, transpile-only; scratch harness `h2.js` outside the repo with a minimal jest implementation and stubs for `@nestjs/*`, `typeorm`, `class-validator`/`class-transformer`):
- Syntax diagnostics: 0 across all new files.
- Specs executed with the mini-jest: `eligibility`, `assignment-engine` (B1), plus new `life-group-task-assignments.service`, `life-group-task-config.service`, `life-group-task-templates.service` specs: 62 passed, 1 failed; the single failure is the B1 engine spec using `toBeLessThanOrEqual`, a matcher my mini-jest lacks (it passed in B1's harness) -- not a code failure.
- `life-group-task-templates.controller.spec.ts` (Reflect metadata on guards/roles) needs real Nest decorators and was NOT executed; the controllers/DTOs themselves load without errors under the harness.
- NOT verified: strict type-check (`nest build`), real jest, eslint/prettier (lines hand-wrapped to <=80 cols except long import lines/strings), Nest DI wiring at boot.
- Re-run in CI/local: `cd backend && npm ci && npx jest src/life-group-tasks && npm run build && npx eslint src/life-group-tasks src/app.module.ts`.

---

## Phase B3 results

Same environment limits as B2 (no Node/npm/`node_modules`): `npx jest`, `npm run build`, `npx eslint`/prettier NOT run.

Substitute validation (VS Code bundled TypeScript via `ELECTRON_RUN_AS_NODE`, scratch mini-jest harness outside the repo, `@nestjs/*`/`typeorm`/`class-*` stubbed):
- Syntax diagnostics: 0.
- 105 passed, 0 failed across: `eligibility`, `assignment-engine`, `life-group-task-assignments.service`, `life-group-task-config.service`, `life-group-task-templates.service`, `life-group-task-notifications.service`, `life-group-tasks.evaluator`, `meeting-day.util`, `reminder-config`, the UNCHANGED `life-group-attendance-reminder.evaluator.spec`, and `notification-channel`.
- NOT executed (need real `@nestjs/testing`/Reflect metadata): `reminders.service.spec.ts` (extended with life_group_tasks validation cases), `life-group-task-templates.controller.spec.ts`, other pre-existing suites (`reminder-scheduler`, `notification-dispatch`, etc.) which are untouched.
- NOT verified: strict type-check, eslint/prettier, Nest DI graph at boot (new import chain: `RemindersModule -> LifeGroupTasksModule -> NotificationsModule/FormsCoreModule`, no cycle).
- Re-run in CI/local: `cd backend && npm ci && npx jest src/life-group-tasks src/reminders src/life-group-attendance src/notifications && npm run build && npx eslint src/life-group-tasks src/reminders src/notifications src/life-group-attendance/meeting-day.util*.ts`.

---

## Phase A1 results

No Node/npm/`node_modules`: `npm run build`, `tsc`, `eslint` NOT run; no admin-ui test runner exists in this repo.
- Syntax-only transpile (VS Code bundled TypeScript via `ELECTRON_RUN_AS_NODE`, all 19 changed/new `.ts/.tsx` files): 0 diagnostics.
- Manual cross-check of types/endpoints against backend DTOs/services (`life-group-tasks/dto`, config/assignments/templates services) and of every imported UI component/hook against existing files.
- NOT verified: strict type-check, lint, runtime rendering/behavior in a browser.
- Re-run locally: `cd admin-ui && pnpm install && pnpm lint && pnpm build` (note next.config ignores TS/ESLint errors during build, so also run `npx tsc --noEmit`).

## Phase M1 results

Java is a stub on this machine (`java -version`: "Unable to locate a Java Runtime"), so `./gradlew :shared:allTests` / `:shared:compileKotlinMetadata` were NOT run. Nothing compiled.
- Added `LifeGroupTaskRepositoryTest` (8 tests: member list/get mapping, unknown status fallback, decline POST + reassigned, decline 409 throws, members mapping incl. reason->note, PUT members omits unchanged fields / explicit clears, settings round trip, templates derived from task-overrides).
- Manual cross-check of DTO field names against backend `my-life-group-tasks.controller`, `toMemberItem`, `buildMembers`, `buildOverrides`, `getSettings`, `decline` return shapes and admin-ui `life-group-tasks.ts`.
- NOT verified: compilation, test execution, iOS framework export. Re-run: `cd kmp-mobile && ./gradlew :shared:allTests`.

## Phase M2 results

Java is a stub (`java -version`: "Unable to locate a Java Runtime"), so `./gradlew :android:testDebugUnitTest`, `:android:assembleDebug` and `ktlintCheck` were NOT run. Nothing compiled.
- Tests added (not executed): `LifeGroupTaskGuideViewModelTest` (7), `LifeGroupDetailViewModelTest` (2), `MarkdownParserTest` (9), `PushNotificationHelperTest` (+3).
- Manual verification: every import/symbol checked against real files (`PazButton`/`PazButtonVariant`, `PazErrorState`, `PazPullToRefresh`, `PazGlassCard`, `PazSkeleton`, `PazMeshBackground`, `PazSpacing`, `PazShapes`, `PazColors.Success`, `brDateString`, shared `LifeGroupTask*` models/repository, `User`, `LifeGroup`); expected values in the parser tests traced by hand against the parser; Compose APIs (`LinkAnnotation.Url`, `TextLinkStyles`, `withLink`) exist in the compose-bom 2025.04.00 (ui-text 1.8). New lines kept <= 140 cols (editorconfig); import order kept lexicographic.
- NOT verified: compilation, test execution, ktlint, runtime rendering.
- Re-run: `cd kmp-mobile && ./gradlew :android:testDebugUnitTest :android:assembleDebug ktlintCheck`.

## Phase M4 (Android) results

Java is a stub, so `./gradlew :android:testDebugUnitTest`, `:android:assembleDebug` and `ktlintCheck` were NOT run. Nothing compiled.
- Added `LifeGroupTaskMembersViewModelTest` (13 tests: load mapping/enabled-only templates/failures, dirty tracking, save payload shape (changed members only, eligible pinned, note/exclusion clear semantics, reset flag), settings-first ordering, clamping, failed save, note length, badge labels). Expected values traced by hand against the ViewModel.
- Cross-checked against the shared API (`LifeGroupTaskMember`, `LifeGroupTaskMemberUpdate`, `LifeGroupTaskSettings`, `LifeGroupTaskTemplateSummary`, repository signatures) and backend DTO limits (`min_present_meetings` 0..52, `reason` <= 1000, `eligible` required unless reset). Icons used exist in the project already (`Outlined.Person`, `Filled.Add/Remove`).
- NOT verified: compilation, test execution, ktlint, runtime UI. Re-run: `cd kmp-mobile && ./gradlew :android:testDebugUnitTest :android:assembleDebug ktlintCheck`.

## Phase M3 / M4 (iOS) results

No iOS test target exists (`project.yml` has `testTargets: []`), so no unit tests were added. The shared XCFramework cannot be built (no Java), so the app was NOT compiled, and `xcodebuild` was not run.
- `xcrun swiftc -parse` passed on every new/modified Swift file (syntax only).
- The pure markdown logic (`LifeGroupTaskMarkdown.parseBlocks`, `isSafeLinkURL`, `attributed`) was extracted into a scratch macOS executable and run: headings/paragraph joining/nested bullets/`1.`/`2)` lists parsed as expected; https/http accepted; `javascript:`, `tel:`, `file:`, `paz://`, host-less https rejected; the link attribute was stripped from `[bad](javascript:...)` and kept for https.
- `plutil -lint` passes on `project.pbxproj` after hand-editing.
- NOT verified: compilation against `Shared`, SwiftUI runtime rendering, swiftformat/swiftlint (not run), the deep link on device. Re-run: `cd kmp-mobile && ./gradlew :shared:assembleSharedXCFramework`, then build the `PazChurch` scheme.

---

## Gap fixes (admin-ui)

- Syntax-transpiled (VS Code bundled TS, 0 diagnostics) markdown-editor.tsx, life-group-tasks-management.tsx, life-group-task-template-form.tsx, use-life-group-tasks.ts, life-group-tasks.ts types.
- NOT done: tsc type-check, lint, build, browser/manual test of split preview and drag-and-drop (no node available). Types cross-checked by reading (DragEvent handler variance, mutation context typing).

## Gap fixes (mobile)

- iOS: `xcrun swiftc -parse` OK on HomeViewModel/HomeView/LifeGroupTaskMarkdownView. Scratch macOS executable compiling the real `LifeGroupTaskMarkdown` + `DeepLinkDestination.swift` sources: fenced code (incl. unclosed, `#` inside kept verbatim), quotes (incl. bare `>` and indented), paragraph flush before quote, http/https-only link sanitizing (javascript:/tel: dropped, link inside inline code literal), inline code intent present, deep link `tarefa/{id}` / blank / extra segments: ALL OK.
- NOT done: Android Gradle build/unit tests (java is a stub; new `MarkdownParserTest` cases and `HomeViewModelTest` unverified, only read-checked), iOS full app compile (needs Shared.xcframework), no iOS test target (see changes.md).

## Gap fixes (backend)

- No node/npm: ran the specs with the scratchpad mini-jest shim (VS Code bundled TS transpile, typeorm/nest stubbed): notifications, assignments, config, roster (new), life-group-tasks evaluator, eligibility, assignment-engine specs: 104 passed, 1 shim limitation (`not.toHaveProperty` is not implemented in the shim; the assertion itself is trivially valid). Transpile diagnostics 0 on all changed .ts files incl. the migration.
- NOT done: real `npx jest`, `npm run build` / tsc type-check (jest.fn typings in the new specs unverified), eslint/prettier, running the migration against Postgres, and real-DB verification of the new `joined_at` present-count SQL and of `UPDATE ... IsNull()` claims (affected row count) against TypeORM/pg.

## Sattler validation (real toolchain)

Toolchain: official Node v22.23.3 darwin-arm64 (SHA256 verified against nodejs.org SHASUMS256.txt, matches Dockerfiles' node:22), extracted under scratchpad and used via PATH only. pnpm 9.15.9 via npx (lockfile v9). No source edited, nothing committed. Generated dirs (node_modules, backend/dist, admin-ui/.next, next-env.d.ts, tsconfig.tsbuildinfo) are all gitignored. Baseline comparisons were done in a temporary git worktree of `main` (removed afterwards).

### Backend
- `npm ci`: OK, lockfile untouched.
- `npx jest src/life-group-tasks src/reminders src/life-group-attendance src/notifications`: 21 suites PASS, 1 FAIL; 184/184 tests pass. The failing suite is `src/notifications/dto/reach.dto.spec.ts` ("Reflect.getMetadata is not a function", missing reflect-metadata import at suite load). It fails identically on `main` (pre-existing, not touched by branch).
- `npm run build` (nest build): PASS.
- Full `npx jest`: branch 6 failed / 70 passed suites, 5 failed / 494 passed tests. `main` baseline: same 6 failed suites (auth.controller, forms-core/notification-sender, home.controller, member-registrations/onboarding.service, notifications/dto/reach.dto, users/user-device-tokens.service), 5 failed / 366 passed. NO regressions; branch adds 128 passing tests.
- `npx eslint` on the 49 changed/added backend .ts files (no --fix): 60 errors, 0 in logic beyond style/typing. Non-spec files: only prettier/prettier errors in `life-group-task-assignments.service.ts` (373, 456, 610, 641) and `life-group-task-config.service.ts` (177, 301) (multi-line param lists that prettier wants collapsed). Spec files: prettier issues in assignment-engine.spec, life-group-task-assignments.service.spec (+7 no-unsafe-member-access), life-group-task-notifications.service.spec (14 prettier, 8 no-unsafe-assignment, 2 prefer-promise-reject-errors, 2 no-unused-vars, 1 unnecessary assertion), life-group-task-roster.service.spec (5 prettier), reminders/evaluators/life-group-tasks.evaluator.spec (3 prefer-promise-reject-errors, 2 unused `_a`, 4 prettier, 1 unnecessary assertion), reminders.service.spec (2 unbound-method at 54, 69). Fix: `npx prettier --write` on those files, then tidy spec typing.
- `npx prettier --check`: 7 files fail: assignment-engine.spec.ts, life-group-task-assignments.service.spec.ts, life-group-task-assignments.service.ts, life-group-task-config.service.ts, life-group-task-notifications.service.spec.ts, life-group-task-roster.service.spec.ts, life-group-tasks.evaluator.spec.ts.

### admin-ui
- `pnpm install --frozen-lockfile`: OK, lockfile untouched.
- `npx tsc --noEmit`: 30 errors on branch vs 28 on `main`. The 28 are pre-existing (agenda.ts, analytics query types, AnalyticsEventName in course/journey hooks, etc.). The branch ADDS 2, both in `components/life-group-tasks/life-group-task-meeting-tab.tsx`: line 109:27 TS2559 and 111:17 TS7006. Cause: `const mutation = skipped ? removeSkip : addSkip; mutation.mutate(date, {...})` calls a union of two differently-typed mutations. Likely fix: `if (skipped) removeSkip.mutate(date, opts) else addSkip.mutate(date, opts)` (shared opts object typed once).
- `npx eslint` on changed .ts/.tsx files: clean (0 problems).
- `npm run build` (next build): PASS (/tarefas-life, /life-groups, /notifications compiled). Note next.config.mjs sets `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds`, so build success does not prove type correctness; see tsc above.

### Mobile
- Android/KMP Gradle tests (shared commonTest, android unit tests): COULD NOT RUN. `java` is the macOS stub; no JDK (no /usr/libexec/java_home result, no ~/Library/Java, no Android Studio jbr). Not validated.
- iOS: `xcrun swiftc -parse` on all 12 changed .swift files: 0 syntax errors each. This is parse-only; no xcodebuild/type-check was run (depends on KMP framework).

### Verdict
Backend: PASS functionally (build ok, tests ok, no regressions); FAIL on lint/prettier cleanliness (new files). admin-ui: build/eslint PASS, tsc FAIL (+2 new errors in meeting-tab.tsx). Mobile Gradle: NOT RUN.

## Round 2 fixes (Arnold re-run, real toolchain, Node v22.23.3)

Backend (`cd backend`):
- `npx jest src/life-group-tasks src/reminders src/life-group-attendance src/notifications`: 21 suites passed, 1 failed (pre-existing `reach.dto.spec.ts`, fails on main); 184/184 tests pass.
- Full `npx jest`: 6 failed / 70 passed suites, 5 failed / 494 passed tests: identical to the pre-fix branch run and to the main baseline failures (auth.controller, notification-sender, home.controller, onboarding.service, reach.dto, user-device-tokens). No new failures.
- `npm run build` (nest build): PASS.
- `eslint` (no --fix) on the 49 changed backend .ts files + the migration: 0 errors. `prettier --check`: all files formatted. Prettier only touched feature files (confirmed via git status).
admin-ui:
- `tsc --noEmit`: 28 errors = main baseline (the 2 new meeting-tab errors are gone). eslint on changed files: clean. `npm run build`: PASS.
Mobile:
- Gradle not run (no JDK). Kotlin changes (nullable `joinedAt` with default null in DTO and domain model; the only constructor call sites are the DTO mapper and a test that uses named args) cross-read. `xcrun swiftc -parse` on `HomeViewModel.swift`: OK.
Not validated: the migration against a real Postgres.

## Migration test (throwaway Postgres)

Round 3 (Owen/Sattler). Real Postgres, no system changes, nothing project-related touched.

Server: `npm install --ignore-scripts embedded-postgres@17.5.0-beta.15` in a new empty scratchpad dir (`.../scratchpad/pg-test/`; lockfile-integrity-verified npm tarballs from registry.npmjs.org; no install scripts run; the `@embedded-postgres/darwin-arm64` package's `pg-symlinks.json` dylib symlinks were recreated by a small own script). Binaries: PostgreSQL 17.5 (not 16; same feature set for these migrations). `initdb -U pgtest --pwfile -A scram-sha-256`, started with `-p 54873 -c listen_addresses=127.0.0.1 -c unix_socket_directories=''` (loopback TCP only), throwaway user `pgtest` / password `pw_throwaway` (not a project secret), database `mig`.

Migration runner: the real TypeORM CLI from the repo, `npx nest build` then `npx typeorm -d dist/db/data-source.js migration:run|revert`, with `DB_HOST=127.0.0.1 DB_PORT=54873 DB_USERNAME=pgtest DB_PASSWORD=pw_throwaway DB_NAME=mig` set only for that process (dotenv never overrides already-set vars; the repo `.env` was not read or used for the connection).

Results (the FULL chain of 82 migrations ran from an empty DB with no unrelated failures, so no minimal-baseline fallback was needed):
1. Full `migration:run` on empty DB: PASS (82 migrations, incl. M3 `AddLifeGroupTasksEnumValues1795900000003` and M4 `CreateLifeGroupTasks1795900000004`). Verified: 6 `life_group_task_*` tables; `assignments.declined_user_ids int[] NOT NULL DEFAULT '{}'`; `member_settings.grandfathered boolean NOT NULL DEFAULT false`; `user_life_groups.joined_at timestamptz NOT NULL DEFAULT now()`; assignments FKs `life_group_id` and `user_id` are `ON DELETE CASCADE` (confdeltype `c`), `template_id` no cascade; `notification_category_enum` has `life_group_task`; `reminder_rule_type_enum` has `life_group_tasks`; rule `life_group_tasks` seeded `enabled=true`, hour 9, days [3,1].
2. `revert` M4, seed 4 users/2 groups/4 memberships (pre-existing rows), `run`: grandfather rows inserted for all 4 memberships (`eligible=t, grandfathered=t, reason NULL`), `joined_at` backfilled to migration time, rule seeded. PASS.
3. Re-run idempotency: deleted M3+M4 from `migrations` (after setting one setting to `eligible=false, reason='leader note'`) and ran again: both executed with no error, still exactly 1 rule row, still 4 settings rows, the leader-edited row untouched (`ON CONFLICT DO NOTHING`). PASS.
4. Earlier-revision upgrade path (dropped `declined_user_ids` and `grandfathered`, replaced the assignment user FK with a non-cascade one, set old marker `reason='grandfathered at migration'` on 2 rows, deleted M4 row): FIRST RUN FAILED with `column "grandfathered" of relation "life_group_task_member_settings" does not exist`. REAL BUG: the grandfather `INSERT ... ("grandfathered")` ran before the defensive `ADD COLUMN IF NOT EXISTS`. FIX: in `backend/database/migrations/1795900000004-CreateLifeGroupTasks.ts` the defensive-upgrade block (ADD COLUMN x2, marker UPDATE, FK re-create DO block) now runs before the `joined_at` / grandfather INSERT. The failed run rolled back cleanly (own transaction). Re-run after fix: PASS: columns added, existing assignment row kept (`declined_user_ids = {}`), old marker rows became `grandfathered=t, reason NULL`, a leader note `manual note` kept, FK re-created as `fk_life_group_task_assignments_user` ON DELETE CASCADE; deleting a user (in a rolled-back txn) cascaded its assignments to 0.
5. `revert` x2 (M4 then M3): M4 drops all 6 tables, the rule row and `joined_at` (membership rows intact); M3 down is a documented no-op (enum values stay, as expected). `run` again: both executed, 6 tables, 4 grandfathered, rule enabled; a further `run`: "No migrations are pending". PASS.
6. Roster SQL (`present count since joined_at`, bind `$2='America/Sao_Paulo'`) with attendance 06-01/06-08/06-15: user without a join row -> 3 (unfiltered), user joined `2026-06-09 02:00Z` (= 06-08 23:00 Sao Paulo) -> 2 (06-08 and 06-15; a UTC-date comparison would give 1), user joined 06-01 with `present=false` on 06-15 -> 1. PASS.
7. Claim logic: `UPDATE ... WHERE id=? AND notified_at IS NULL`: first claim affected 1, second 0, after release (`SET notified_at=NULL`) reclaim 1; `reminded_at` claim independent (1 then 0). `reminder_dispatch_log` unique `(rule_type, dedupe_key)`: second insert of the same key raises 23505, after delete the claim succeeds again. PASS.

Also: prettier + eslint on the fixed migration file are clean; `nest build` OK. Cleanup: server stopped (`pg_ctl stop`), the scratch data dir and the whole `pg-test` dir removed; `backend/dist` (gitignored) was rebuilt by `nest build`.

## Mobile validation (real toolchain)

Environment: macOS arm64, Xcode 26.6 (17F113), iOS 26.5 simulator, Temurin JDK 17.0.20.1+1 (aarch64 tarball, SHA256 196d13ba...f0e8 verified against the published .sha256.txt), Gradle 8.11.1 via wrapper (official services.gradle.org URL), Kotlin 2.1.0, AGP 8.7.3. `JAVA_HOME`, `GRADLE_USER_HOME` and `KONAN_DATA_DIR` all pointed into the session scratchpad; no system changes.

| Step | Command (from kmp-mobile) | Result |
|---|---|---|
| Shared tests (native) | `./gradlew :shared:iosSimulatorArm64Test` | PASS: 78 tests, 0 failures, 0 skipped (13 classes, incl. LifeGroupTaskRepositoryTest). Needs no Android SDK. |
| XCFramework | `./gradlew :shared:assembleSharedDebugXCFramework` | PASS. Note: CLAUDE.md's `:shared:assembleXCFramework` is ambiguous in Gradle; the real task is `assembleSharedXCFramework` (what project.yml uses). |
| iOS app build | `xcodebuild -project ios/PazChurch.xcodeproj -scheme PazChurch -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build` | First run FAILED in feature code: `LifeGroupTaskMembersViewModel.swift:35 reference to member 'auto'`. Kotlin enum entry `AUTO` is exported to Swift as `auto_`. Fixed (commit e57a68c); rebuild: BUILD SUCCEEDED. |
| iOS tests | `xcodebuild ... -scheme PazChurch -destination 'id=<iOS 26.5 sim>' test CODE_SIGNING_ALLOWED=NO` | PASS: 13 tests, 0 failures (new `PazChurchTests` target). |
| `:shared:allTests`, `:shared:testDebugUnitTest`, `:android:testDebugUnitTest`, `:android:assembleDebug` | n/a | NOT RUN: AGP fails at configuration with "SDK location not found" (`:shared` also applies com.android.library). |
| ktlint | n/a | NOT RUN: no ktlint/spotless plugin is configured in any build file, so `ktlintCheck`/`ktlintFormat` (mentioned in CLAUDE.md) do not exist. |

New iOS tests (`kmp-mobile/ios/PazChurchTests/`, hosted unit-test target, added to project.yml and project.pbxproj; `plutil -lint` OK, scheme XML valid): deep link `tarefa/{id}` / blank id / extra segments / `usesHomeStack` / existing routes (5), `LifeGroupTaskMarkdown` block parsing, fenced code, quotes, link sanitizing (6), `HomeViewModel.upcomingTasks` filter/sort/limit (2).

Local-only caveat: the app host calls `FirebaseApp.configure()` at launch, and `ios/PazChurch/GoogleService-Info.plist` is gitignored (missing in a fresh checkout; the build fails without it, and the `.example` placeholder crashes the test host). For validation I used a temporary syntactically valid fake plist and deleted it afterwards. Running the iOS tests on a fresh machine/CI needs a real (or fake-but-valid) GoogleService-Info.plist.

What the user must do to run the Android part (not done, per the no-silent-SDK rule): install the Android SDK (e.g. Android Studio, or cmdline-tools) with `platforms;android-35`, `build-tools;35.0.0` (or the AGP 8.7.3 default) and `platform-tools`; accept licenses yourself with `yes | sdkmanager --licenses` (or `sdkmanager --licenses`); then create `kmp-mobile/local.properties` with `sdk.dir=/Users/<you>/Library/Android/sdk` (or export `ANDROID_HOME`) and run `./gradlew :shared:allTests :android:testDebugUnitTest :android:assembleDebug` with JDK 17.

## Backend (home-card branch)

Tooling: Node v22.23.3 (scratchpad download), existing `backend/node_modules`.

| Check | Result |
|---|---|
| Phase 0 `jest src/life-group-reports` (characterization, pre-fix code) | PASS (3): list/detail serialize to `{}`, audit to `[{}]`, no scope check for a plain member |
| `npx jest src/life-group-reports src/life-group-analytics src/life-group-attendance src/casa-de-paz-reports src/forms-core` | PASS except `notification-sender.spec` (baseline failure) |
| `npx jest src/life-group-reports` after fix | PASS: 2 suites, 27 tests |
| `npm run build` | PASS |
| `npx eslint src/life-group-reports` | 0 errors, 8 warnings (`no-unsafe-argument` on supertest `getHttpServer()`, same as the existing analytics controller spec) |
| `npx prettier --check src/life-group-reports` | PASS |
| Full `npx jest` | 72 suites pass, 6 fail = baseline set (auth.controller, notification-sender, home.controller, onboarding.service, reach.dto, user-device-tokens); 5 failed tests, none new |
| admin-ui tsc/eslint | NOT RUN (admin-ui untouched) |

## Shared + Android (home-card branch)

Tooling: JDK 17.0.20 (scratchpad), `GRADLE_USER_HOME`/`KONAN_DATA_DIR` in scratchpad.

| Check | Result |
|---|---|
| `./gradlew :shared:iosSimulatorArm64Test` (kmp-mobile) | BUILD SUCCESSFUL; new `LifeGroupReportRepositoryTest` 5/5, `HomeLifeGroupCardTest` 7/7, no failures |
| `:android:testDebugUnitTest`, `:android:assembleDebug`, `ktlintCheck` | NOT RUN (Android SDK not installed); validated by CI. Android code cross-checked by hand against real files (imports, Koin `get()` counts: HomeViewModel 4 and LifeGroupDetailViewModel 4 unchanged; new VMs take 1 `get()` each; every test constructing changed VMs reviewed) |

## iOS (home-card branch)

Environment as in "Mobile validation (real toolchain)" (Xcode 26.6, 'TestPhone' simulator, scratchpad JDK17/Gradle/Konan, temporary fake `GoogleService-Info.plist` created for the run and DELETED afterwards, never committed).

| Step | Result |
|---|---|
| `./gradlew :shared:assembleSharedDebugXCFramework` | BUILD SUCCESSFUL (exports `HomeLifeGroupCardKt`, `LifeGroupReportRepository`, `LifeGroupWeeklyReport`) |
| `xcodebuild -scheme PazChurch -destination 'platform=iOS Simulator,id=<TestPhone>' CODE_SIGNING_ALLOWED=NO build-for-testing` | TEST BUILD SUCCEEDED (first compile, no source errors) |
| `xcodebuild ... test-without-building` | PASS: 32 tests, 0 failures (13 previous + 7 new HomeViewModelTests + new LifeGroupReportsTests incl. gate matrix, 403/404 mapping, VM states via fake repository) |
| `plutil -lint ios/PazChurch.xcodeproj/project.pbxproj` | OK |
| swiftformat / swiftlint | NOT RUN (not checked/installed in this session) |

Test log noise (`localhost:3001` connection refused) comes from the hosted app launching with no backend; unrelated to results. UI layout (cards, detail rows) is verified by build only; use the manual QA checklist in the spec.

## Review fixes (home-card branch)

| Check | Result |
|---|---|
| `npx jest src/life-group-reports` | PASS: 2 suites, 27 tests (audit mapping/no-PII asserted; submitter-404 case replaces the old submitter-allowed case) |
| backend `eslint src/life-group-reports` | 0 errors, 8 pre-existing `no-unsafe-argument` warnings (controller spec) |
| backend `prettier --check src/life-group-reports` | clean |
| `npm run build` (nest build) | OK |
| Full `npx jest` | 72 suites pass, 6 fail = baseline set; 5 failed / 528 passed tests, none new |
| `./gradlew :shared:iosSimulatorArm64Test :shared:assembleSharedDebugXCFramework` | BUILD SUCCESSFUL (import reorder only in shared) |
| `xcodebuild -scheme PazChurch -destination TestPhone CODE_SIGNING_ALLOWED=NO test` (JAVA_HOME set for the Gradle build phase) | TEST SUCCEEDED: 32 tests, 0 failures, with `nonisolated static canViewGroupReports` called from non-isolated tests. Temporary fake `GoogleService-Info.plist` (39-char API key) deleted afterwards, gitignored, never committed. |
| Android (`testDebugUnitTest`, assemble, ktlint) | NOT RUN (no SDK); cross-read. New test `failed refresh keeps the loaded list and emits a transient error`; exhaustive `when` over `LifeGroupReportsEffect` only exists in `LifeGroupReportsScreen` (ShowError branch added). |

## Pilot readiness (study push, tasks late setup) - Owen

- `npx jest src/life-group-studies src/reminders`: PASS (study specs 34 incl. new audience, publish-once, assigned-writer, controller no-@Roles; evaluator specs +2 late-setup).
- Full jest: 6 failed suites (same baseline: auth.controller, notification-sender, home.controller, onboarding.service, reach.dto, user-device-tokens), 73 passed; 545 tests pass, 5 fail (baseline).
- `nest build` OK; eslint clean on touched files; prettier --check clean.
- Migration chain on throwaway embedded Postgres 17.5 (new scratchpad dir, port 54891, loopback only, stopped with pg_ctl): full chain incl. `1795900000005` PASS; enum values `...,life_group_attendance,life_group_task,life_group_study`; second `run` = "No migrations are pending". Defect reproduced on a second DB built without the new migration: `select 'life_group_study'::notification_category_enum` -> `invalid input value for enum`; after running the new migration it succeeds (upgrade path).
- Mobile: `swiftc -parse` OK on `MinistryDetailView.swift`; xcodebuild and Android (no SDK) not run for the icon-only change; Android cross-read (`Icons.Outlined.People` is in material-icons-extended, same artifact as the already-imported `Groups`/`BarChart`).

## Review fixes (pilot-readiness)

- Backend `npx jest src/life-group-studies`: 3 suites, 36 tests PASS (new: no persist/dispatch with empty recipients; create resolves with a never-resolving dispatch; existing failure-logging and once-only tests adapted to flush the detached dispatch).
- Full jest: 6 failed suites (same baseline), 73 passed; 547 tests pass, 5 fail (baseline). `nest build` exit 0; eslint on `src/life-group-studies` exit 0; prettier --check clean.
- iOS `xcodebuild test -only-testing:PazChurchTests` on TestPhone (temporary fake GoogleService-Info.plist, deleted afterwards): rc=0, DeepLinkDestinationTests 15 tests, 0 failures (new: unsafe ids, uuid/slug/numeric accepted, presenca id/date, account-stack classification).
- Android: cross-read only (new PushNotificationHelperTest cases: unsafe ids, accepted id shapes, presenca validation); CI validates.

## Merge with develop (#89/#93) validation

Backend (node 22, scratchpad):
- `nest build` OK. Scoped jest (life-group-studies, life-group-tasks, reminders, notifications, forms-core, life-groups, life-group-attendance, life-group-reports, casa-de-paz): 35 suites pass; the only failures are `forms-core/services/notification-sender.spec` and `notifications/dto/reach.dto.spec` (both inherited).
- Full `npx jest`: 7 failed suites / 27 failed tests / 551 passed. Same run on a separate worktree of origin/develop: 7 failed suites / 27 failed tests / 532 passed. The failing suite set and the failing test names are identical (auth.controller, auth.service, home.controller, onboarding.service, user-device-tokens, notification-sender, reach.dto): all INHERITED (e.g. AuthService spec cannot resolve `UserChurchRepository` after #89). No failures caused by this branch.
- eslint (no --fix) and prettier --check on the 14 changed backend .ts files: clean.

Migrations on throwaway embedded Postgres 17.5 (new scratchpad dir, 127.0.0.1:54911, creds pgtest/pw_throwaway, env on the CLI process only):
- Full chain from empty DB: 86 migrations OK (#89 `...03/04/05` then ours `...06/07/08`); second run "No migrations are pending"; 6 `life_group_task*` tables; `notification_category_enum` includes `life_group_task`, `life_group_study`.
- Revert x3 (08, 07, 06): OK, 83 left, 0 task tables; re-run applies the 3 again; another run: nothing pending.
- Prod-state emulation: develop's chain (85 migrations, incl. old `AddLifeGroupTasksEnumValues1795900000003`, `CreateLifeGroupTasks1795900000004`, #89's 3/4/5) from a develop worktree, then this branch's `migration:run`: 6/7/8 applied cleanly on top (idempotent), then nothing pending; exactly 1 `life_group_tasks` reminder rule.
- Cleanup: server stopped with pg_ctl; worktree removed; `rm -rf` of the scratch data dir was denied by the sandbox, so the (stopped) scratchpad `pg4` dir remains.

iOS (Xcode 26.6, TestPhone, scratchpad JDK17/Gradle/Konan):
- `./gradlew :shared:assembleSharedDebugXCFramework :shared:iosSimulatorArm64Test`: BUILD SUCCESSFUL, 92 tests, 0 failures.
- `xcodebuild test` PazChurch on TestPhone: first run FAILED to compile `HomeViewModelTests.swift:41` (missing `relationship`/`isSupervised`, from #93, inherited on develop). After the one-line test fix: TEST SUCCEEDED (15+9+12+6 = 42 tests, 0 failures). Temporary fake GoogleService-Info.plist (39-char key) deleted afterwards, never committed.
- Android: not buildable locally (no SDK); cross-read only: Android files changed by #89 (AccountViewModel, AndroidModule, Academy, MemberJourney) do not overlap ours (MainActivity, PazNavGraph, push helper, MinistryDetailScreen).

## Phase 0 backend+admin-ui (fix/life-group-report-submit)

Node 22.23.3 (scratchpad). Backend:
- `npm run build` OK.
- Scoped jest (life-group-reports, forms-catalog, forms-core, life-group-attendance): 10 suites; only failure is the known `forms-core/services/notification-sender.spec`.
- Full `npx jest`: 6 failed suites / 5 failed tests / 620 passed (80 suites): exactly the 6 known baseline suites (auth.controller, notification-sender, home.controller, onboarding.service, reach.dto, user-device-tokens). No develop worktree was needed since the failing set matches the documented baseline.
- eslint (no --fix) on src/life-group-reports and src/forms-catalog: 0 errors, 11 `no-unsafe-argument` warnings (supertest `app.getHttpServer()` pattern, same as the pre-existing lines of the controller spec). prettier --check clean.
Admin-ui: `pnpm install --frozen-lockfile` (pnpm 9.15.9) OK; `tsc --noEmit` 26 errors both before and after this change (identical sorted lists, so no new ones; lead's baseline said 28); eslint on the 3 changed files clean; `next build` OK.
Not verified: no real Postgres run of the `findOne` with `select` + nested relations (mocked EntityManager); no manual run of the admin-ui form against a live backend; mobile untouched.

## Phase 0 mobile + reminder

JDK 17 (scratchpad), Node 22.23.3 (scratchpad). Android SDK not installed: no Android compile/unit run.
- Shared: `./gradlew :shared:iosSimulatorArm64Test`: 110 tests, 0 failures (new: `LifeGroupReportDraftTest`, `FormsRepositoryLifeGroupReportTest`). `:shared:assembleSharedDebugXCFramework` OK.
- iOS: `xcodebuild test -only-testing:PazChurchTests` on simulator "TestPhone" with a TEMPORARY fake `GoogleService-Info.plist` (deleted afterwards, never committed): 53 tests, 0 failures (new `LifeGroupReportFormTests`: 12). swiftformat applied to the new files; swiftlint: only warnings (type_body_length 297>250 on `LifeGroupReportFormView`).
- Android: NOT compiled/tested locally (Compose screen, ViewModel, nav/DI wiring and `LifeGroupReportFormViewModelTest` were cross-read only; CI is the first compile). Risk spots: `SelectableDates`/`rememberDatePickerState(selectableDates=)` (material3 1.3 BOM 2025.04), `if (x != null) { { Text(x) } } else null` for `supportingText`/`placeholder`, Koin `parametersOf(Int?)`.
- Backend: `npm run build` OK; `npx jest src/reminders`: 8 suites / 56 tests pass (form-report spec 11; also green with TZ=UTC and TZ=Asia/Tokyo); prettier --check clean; eslint on touched files: only the 3 pre-existing `no-unsafe-*` errors of the old part of the spec (same on baseline).
- Not verified on device: the new screens on a real Android/iOS device against a live backend (date picker, keyboard behavior, dark mode, group picker with several groups, 409/422 from a real server), the deep link `paz://form/life-group-reports`, and the reminder against a real Postgres (mocked EntityManager; `DISTINCT` + soft-delete QB behavior unverified).
