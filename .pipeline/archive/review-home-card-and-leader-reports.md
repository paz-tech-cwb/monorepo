# Review: life group home card + per-group leader reports

Reviewer: Malcolm. Branch `feat/life-group-home-card` vs `origin/develop` against `.pipeline/spec.md`. Read-only review, nothing committed.

Checks run: backend `jest src/life-group-reports` (27 passed), `eslint` (0 errors, 8 `no-unsafe-argument` warnings in the controller spec), `prettier --check` (clean). Android and iOS were not compiled; reviewed by reading only.

## Verdict: SHIP WITH FIXES

There are no blockers. One major issue (PII exposure in the audit endpoint) should be fixed before merge. The remaining findings are minor.

## Blocker

None.

## Major

### M1. `GET /forms/life-group-reports/:id/audit` now leaks full `User` entities (new PII exposure)
- Where: `backend/src/life-group-reports/life-group-reports.controller.ts:27` (`exposeAll` on the whole controller) and `life-group-reports.service.ts` `auditLog()`, which returns `audit.listForSubmission()` unmapped.
- That query loads `relations: ['actor']`. Before this change the global `excludeAll` serializer reduced the response to `[{}]`, so nothing leaked. With `exposeAll` the actor is serialized in full.
- `User` has no `@Exclude`, so `email`, `phoneNumber`, `birthDate`, `picture`, `status`, the eager `role` and more reach the client.
- The audience is now every in-scope reader, including co-leaders and leaders. Under the old behaviour the data was never reachable.
- Casa de Paz has the same pattern, but that is not a reason to widen it here.
- Fix: map the audit rows in `auditLog()` to the admin-ui `AuditLogEntry` shape. That type is declared in `admin-ui/lib/api/types/formularios.ts:28`; `audit-log.tsx` reads `actor.name` and `createdAt ?? created_at`.
  ```ts
  rows.map(r => ({
    id: r.id,
    form_slug: r.formSlug,
    submission_id: r.submissionId,
    action: r.action,
    diff: r.diff,
    created_at: r.createdAt,
    actor: { id: r.actor.id, name: r.actor.name },
  }))
  ```
- Update the controller spec, which currently asserts `[{ id: 'a1' }]`, to cover the mapped shape and assert that no `email` or `phoneNumber` is present.
- Also review `diff`: on update it is the raw DTO, so it can include `offering` and attendance counts. That is the same data the reader can already see, so it is acceptable.

## Minor

1. **Import ordering (ktlint, ASCII).** `lifegroupreports` is placed before `lifegroupattendance`, and it should come after `lifegroupdiscovery`.
   - `kmp-mobile/android/.../di/AndroidModule.kt:22-23`
   - `kmp-mobile/android/.../navigation/PazNavGraph.kt:28-29`
   - Also `LifeGroupReportRepository(Impl)` before `LifeGroupAttendance...` in `shared/.../di/SharedModule.kt` and `iosMain/.../IosAppContainer.kt`. The `LifeGroupTask` imports in those files were already out of order, so `:shared` is evidently not ktlint-checked.
   - `ktlintCheck` is not part of CI (`ci-kmp-mobile.yml` only runs assemble and tests), so this will not fail CI. Run `ktlintFormat` anyway.

2. **iOS test isolation risk.** `kmp-mobile/ios/PazChurchTests/LifeGroupReportsTests.swift:6-27` has three gate tests that call `LifeGroupDetailView.canViewGroupReports(...)` from non-`@MainActor` test methods.
   - A `View` struct is main-actor isolated, so a synchronous call from a nonisolated context can fail to compile, depending on the Xcode 26 SDK and `@preconcurrency`.
   - The other tests in the file, and `HomeViewModelTests`, already use `@MainActor`.
   - Fix: add `@MainActor` to those three tests, or declare the helper `nonisolated static`. `lifeGroupMeetingLabel` is a free function and is fine.

3. **Android `LifeGroupReportsViewModel`:** `fun load() = load(showSkeleton = true)` is an expression-bodied overload of the private `load(Boolean)`.
   - It is probably fine, but it is the one spot that risks a "recursive type inference" compile error that CI would only catch.
   - Safer: `fun load() { load(showSkeleton = true) }`, or rename the private function.

4. **Refresh failure replaces the list on both platforms.**
   - Android `LifeGroupReportsViewModel.load` sets `error` and the `when` shows the error over a populated list.
   - iOS `LifeGroupReportsViewModel.load` does the same; its test `testRefreshKeepsContentOnFailure` asserts `vm.error != nil` while the list is kept, and the view branch shows the error.
   - Consider keeping the content visible when `reports` is non-empty and showing a transient error instead.

5. **Android `LifeGroupHomeCard` header `Surface(onClick)`** has no `fillMaxWidth`. The inner `Row` is `fillMaxWidth`, so it works, but adding `modifier = Modifier.fillMaxWidth()` to the `Surface` makes the touch target explicit and matches `LifeGroupDiscoveryCTA`.

6. **Backend list vs detail inconsistency.**
   - `findEntity` lets the submitter read their own report, even in a group they no longer lead.
   - `list` does not include reports a user submitted outside their allowed groups.
   - Harmless but surprising. Either drop the submitter rule or add `submitted_by` to the list filter. This is documented as intended in the spec, so low priority.

7. **iOS detail view model:** `LifeGroupReportDetailViewModel.load` returns on cancellation without resetting `isLoading` (`LifeGroupReportsViewModel.swift`, `catch is CancellationError { return }`).
   - If the view task is cancelled while `report == nil`, the skeleton stays until the next `.task` run, which does happen on re-appear.
   - Low impact.

8. **`LifeGroupDetailUiState.canManage` (Android) and the iOS `canManage` property** are now unused in the reports gate.
   - Not a compile error. Check whether other code still reads them, and remove them if not.

## Verified OK

### Backend authorization and contract
- **Visible groups:** `list()` allows the form scope plus every group where the actor is `leader_id` or `co_leader_id`. Unrestricted actors (admin and pastor) are not filtered.
  - A co-leader with role `member` works.
  - A leader of two groups sees both.
  - A plain member gets `1=0`.
- **Filter:** a `life_group_id` filter outside the allowed set returns 403, the same as analytics. An in-set filter narrows the result.
- **`GET :id` and `:id/audit`:** `findEntity(id, scope, actor)` returns 404, not 403, when out of scope. Admin and pastor are unrestricted. Leader/co-leader and submitter are allowed.
- **Internal `update`:** it calls `findEntity(id)` unscoped on purpose and then applies `policy.assertCanEdit`.
- **`create`:** the creation logic is unchanged. The unscoped `findEntity` reload there is intentional. Its response is now `toResponse` (snake_case).
  - admin-ui `useCreateFormSubmission<unknown, ...>` ignores the body.
- **`toResponse` leakage:** `submitted_by` is only `{id, name}`. No other relation is exposed. `@SerializeOptions(exposeAll)` is therefore safe for list and detail. It is only a problem for audit (see M1).
- **DTO:** `ListLifeGroupReportsQueryDto` has `@Expose`. I verified with a scratch `ValidationPipe` using the project's global options that unknown query params are stripped, not rejected with 400.
  - The admin-ui generic list sends `start_date` and `end_date` by default (`submission-filters.tsx`). It is not broken by the new DTO, and those params remain ignored by the backend, as before.
- **admin-ui consumers:**
  - `_columns.tsx` keys `date`, `committed_members_present`, `guests`, `offering` and `submitted_by` match the new snake_case shape. `fmt.by` reads `submitted_by.name`.
  - Type `LifeGroupReport.pastoring_activity_type: string` is stale (it is now `string[]`), but it is only a TypeScript type and the column renderer does not use it.
  - Previously the raw entity serialized to `{}`, so this is a net improvement.
- **Specs:** the service spec and the controller spec exercise the real pipe and serializer. They cover the DTO and `{}` regressions, the 403 and 404 matrix, and the leader/co-leader fallback.

### Shared and contract
- **DTO tolerance:** `LifeGroupReportRepositoryImpl` reads a number or string `offering` and an array or string multi-value field, defaults missing fields, and relies on `ignoreUnknownKeys`. The URL and query match the backend. 403 and 404 surface as `ClientRequestException`, so `httpStatusCodeOrNull()` works on both platforms.
- **`buildHomeLifeGroupCards`:** correct on ordering (leader/co-leader first, then name), the cap of 3, `hiddenCount`, task folding by `lifeGroupId`, orphan tasks dropped, and per-card filter, sort and cap. The Kotlin and Swift sides share it, so they cannot drift.

### Home
- **Legacy fallback:** the legacy tasks-only card shows only when groups failed and tasks loaded. Groups and tasks are fetched independently. Neither failure sets `error`. The discovery CTA shows only when groups succeeded and are empty.
- **Cancellation:** `CancellationException` is rethrown on Android. On iOS cancelled fetches keep the current state.
- **Navigation:** on iOS the header link and the task rows are sibling `NavigationLink`s (`LifeGroupTaskRows`), with no nesting. On Android the header and rows are sibling click targets. "Ver todos (N)" is `cards + hidden` on both platforms.

### Gate (`canViewGroupReports`)
- **Android and iOS:** `isGroupLeadership || admin || pastor || area_leader || sector_leader`, where leadership is matched by id against `leaderId` / `coLeaderId`. This covers a co-leader with role `member`.
- **Excluded:** members, disciplers, guests and another group's `life_group_leader` never see the entries. Unit tests cover the matrix on both platforms.
- **Rows:** the existing "Relatórios" row now uses the same gate as the new "Relatórios semanais" row.

### Analytics scoped mode
- **Platforms:** the group dropdown or picker is hidden when opened with a `lifeGroupId` (`isScopedToGroup`) on both Android and iOS. The fallback label is "Este grupo". Backend enforcement is unchanged.

### Android compile review
- **Imports and symbols:** I checked every import in the changed files and every symbol they use. `PazShapes` is top-level in `PazTheme.kt`, `PazColors.accent` is a `@Composable` getter used inside composables, and the icons (`automirrored.outlined.Assignment`, `KeyboardArrowRight`) already exist elsewhere. `items` is imported, `Surface(onClick=...)` already has precedent in the same file, and `httpStatusCodeOrNull` and `PazPullToRefresh(content: BoxScope.() -> Unit)` match.
- **Koin:** `viewModel { (id: Int) -> LifeGroupReportsViewModel(id, get()) }` has one `get()` per dependency. `LifeGroupReportRepository` is bound in `SharedModule`.
- **Navigation:** nav args are validated (`toIntOrNull`) before the screen is created. The `Screen` routes exist.
- **Tests:** the test constructors match the signatures: `HomeViewModel(..., today)`, `LifeGroupAnalyticsViewModel(7, repo)`, and `LifeGroupDetailViewModel("10", church, auth, task)`. `clientException` is called outside `coEvery` and inside the suspend `runTest` lambda, so it is fine. `LifeGroup(...)` has defaults for every field the tests omit.
- **Line length:** no added line exceeds 140 characters.
- **String templates:** `"Ver todos (${lifeGroupCards.size + hiddenLifeGroupsCount})"` and `"Líder: $it"` are fine.

### iOS
- **`pbxproj`:** `plutil -lint` is OK and every new id appears the expected number of times (2 or 3). New files are in the Sources phases of the correct targets, and the new group is registered. `project.yml` globbing covers the new files.
- **Swift:** `HomeLifeGroupCardKt` and `KotlinInt` bridging look correct, as do the `LifeGroup` memberwise argument order in the tests and the `.areaLeader` / `.sectorLeader` enum names.
- **Secrets:** no secret or fake `GoogleService-Info.plist` was committed. Only the existing `GoogleService-Info.plist.example` is tracked. The diff contains no plist, json or env files.

### Docs
- `.ai/apps/{backend,mobile}.md` and `.ai/features/{life-groups,mobile-app}.md` match the code (snake_case fields, 404 vs 403, the gate, the fallback). The stale "no iOS unit-test target" paragraph was corrected.
- The Postman collection update promised in the spec is not in the diff. I did not find an `admin-ui/postman` change. This is cosmetic, but it is a spec deliverable.

## Not validated here
- Android compile, `ktlintCheck`, `testDebugUnitTest`, iOS build and tests, and `:shared:allTests` were not run. The compile risks are minor items 2 and 3 above.
- Manual QA checklist in spec section 7.
