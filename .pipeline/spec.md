# Spec: Life group home card + per-group leader reports

Author: Grant (planner). Date: 2026-10-12. Branch: `feat/life-group-home-card` (from origin/develop).
Previous pipeline files archived to `.pipeline/archive/*-before-life-group-home-card-2026-10-12.md`.

## 1. Request summary (requirements)

1. Home (Android + iOS): when the user belongs to a life group, show ONE card per group with name, leader, meeting day/time and the existing summary data, FOLDING the current "Minhas tarefas" home card into it (not two cards). Tap opens life group detail. Hidden when the user has no group; degrade quietly on fetch failure. Multi-group behaviour: decide, document, flag as product question.
2. Life group detail: leader and co-leader see a report entry that opens the report for THIS group only (not via the general Relatorios area). Reuse existing relatorios / life-group-reports / attendance / analytics code scoped to the group id. Verify backend authorization (ScopeGuard, co_leader_id fallback); backend changes only if needed. Non-leader members never see the entry.

## 2. Context read

`.ai/README.md`, `.ai/features/{life-groups,forms,mobile-app}.md`, `.ai/apps/{mobile,backend}.md`, `kmp-mobile/CLAUDE.md`, handoff template. (`kmp-mobile/docs/CODING_GUIDELINES.md` must be read by the implementer before coding.)

## 3. Investigation findings (verified in code)

### 3.1 What exists on mobile today

- Home Android: `HomeViewModel.fetch()` already calls `churchRepository.getMyLifeGroups()` but only keeps `showLifeGroupDiscoveryCTA = myGroups.isEmpty()` (the list itself is discarded). Tasks: `taskRepository.getMyTasks()` -> `selectUpcomingTasks` (ASSIGNED, `meetingDate >= today`, soonest first, limit 3) -> `HomeUiState.myTasks` -> `MyTasksCard` (defined `internal` in `ui/features/ministries/MinistryDetailScreen.kt`, also used by the detail screen). Rendered in `HomeContent` as item `my_tasks`.
- Home iOS: `HomeViewModel.load()` does the same (`getMyLifeGroups` -> bool only; `upcomingTasks` static, covered by `PazChurchTests/HomeViewModelTests`), card `LifeGroupMyTasksCard(tasks:repository:)` in `Features/LifeGroupTasks/`, rendered in `HomeView.contentSections`.
- `getMyLifeGroups()` -> `GET /life-groups/me` (`LifeGroupsService.findMine`): groups where viewer is leader, co-leader or roster member, ordered by name, via `toResponse(lg, viewer)`. `LifeGroup` model (shared `Church.kt`) already has everything the card needs: `id, name, leaderId, leader (name), coLeaderId, coLeaderName, meetingDay, meetingTime, membersCount, kidsCount, location`. No backend change for the card.
- `LifeGroupTask` has `lifeGroupId` + `lifeGroupName`, so tasks fold into a group card by `lifeGroupId`.
- Life group detail: Android `LifeGroupDetailScreen`/`LifeGroupDetailViewModel` (in `ui/features/ministries/MinistryDetailScreen.kt` / `MinistryDetailViewModel.kt`, route `Screen.LifeGroupDetail` = `life_group_detail/{lifeGroupId}`); iOS `LifeGroupDetailView` in `Features/Ministries/MinistryDetailView.swift` (takes a `LifeGroup` value; used from list, map, search, `DeepLinkViews`).
- Leader gate: `canManageAttendance` = current user id equals `group.leaderId` or `group.coLeaderId` (no role slug needed, works for co-leaders with role `member`). `canManage` = `role.isLeader` (any leadership role, NOT group specific).
- A "Relatorios" row ALREADY EXISTS on the detail screen on both platforms, shown when `canManage || canManageAttendance`, opening `LifeGroupAnalyticsScreen/View` pre-scoped to the group (`Screen.LifeGroupAnalytics.createRoute(groupId)`, iOS `LifeGroupAnalyticsView(lifeGroupId:)`). Also existing per group: "Presenca" (attendance history/editor, `canManageAttendance`), "Elegibilidade para tarefas".
- The general Relatorios area: Account -> "Relatorios" (`ReportsListScreen`/`ReportsListView`, `role.isLeader`) -> Casa de Paz list, life group analytics (all groups), Casa de Paz analytics. Admin-ui: `/relatorios` (analytics) and `/formularios/life-group-reports` (generic list + create form).
- Mobile has NO listing/detail of weekly life-group reports at all (`FormsRepository` only has `submitLifeGroupReport`).

### 3.2 What "the report" is

Three different things share the name:
- (A) Weekly report form `life-group-reports` (backend `src/life-group-reports`, entity `life_group_reports`: date, area/sector/life_group ids, committed_members(+present), kids_0_to_11, guests, mdas, offering, tadel/culto, leader_attended, disciples, pastoring/training activity). Catalog: read/write for admin, pastor, area_leader, sector_leader, life_group_leader.
- (B) Attendance (`life-group-attendance`, per-meeting records) and (C) analytics (`life-group-analytics`: attendance by month/meeting, distribution, overview; already accepts `life_group_id`).
(B)+(C) are what the existing in-group "Relatorios" row shows today. (A) is not reachable per group on mobile.

### 3.3 Backend authorization assessment (life-group-reports)

- `ScopeGuard` only RESOLVES `req.formScope`; it never denies. Authorization lives in services. Attendance (`assertCanAccess`: unrestricted || group in scope || leader_id || co_leader_id) and analytics (`resolveLifeGroupIds`: scope + leader/co-leader groups, 403 when `life_group_id` filter not allowed) both implement the co-leader fallback correctly. => Presenca and Relatorios-analytics per group are ALREADY authorized for leader, co-leader, scoped area/sector leaders and admin/pastor. No change.
- `LifeGroupReportsService.list(scope)` has NO co-leader/leader fallback and NO `life_group_id` filter: a co-leader whose role slug is `member` gets `1=0` (empty); `ScopeResolver` for `life_group_leader` uses `findOne` so a leader of 2 groups sees only one. => GAP for co-leaders (and double-group leaders).
- `GET forms/life-group-reports/:id` and `/:id/audit` call `svc.findOne(id)` with NO scope check: any authenticated user (even a plain member) can read any report (incl. offering, attendance counts) and its audit log if they know the UUID. UUIDs are unguessable so real-world exploitability is low, but the per-group screen would expose ids to co-leaders and the endpoint is an object-level authorization gap. `casa-de-paz-reports` already fixes the same pattern (scope-aware `findEntity`, 404 when out of scope) and its code comments call it out. Verdict: a real (medium) authorization gap and warranted fix; minimal fix = scope-aware read mirroring Casa de Paz + leader/co-leader fallback, returning 404 (not 403) to avoid id probing.
- Serialization risk (must be verified first, Phase 0): the controller returns raw TypeORM entities with no `@Expose` and no `@SerializeOptions`, while `main.ts` installs `ClassSerializerInterceptor({strategy:'excludeAll', excludeExtraneousValues:true})`. I reproduced locally with class-transformer that such an instance serializes to `{}`. The repo's own Casa de Paz comments describe exactly this bug and its fix (explicit snake_case `toResponse` + `@SerializeOptions({strategy:'exposeAll', excludeExtraneousValues:false})`). If confirmed, `GET /forms/life-group-reports[/:id]` returns empty objects to every client today, so any per-group report list needs this mapper anyway. Admin-ui types (`LifeGroupReport`, snake_case, `submitted_by:{id,name}`) and `_columns.tsx` (keys `date`, `committed_members_present`, `guests`, `offering`, `submitted_by`) already expect the snake_case shape, so the mapper aligns the backend with admin-ui rather than breaking it. Also no spec files exist for this module.
- `POST` create: `@Roles(...)` excludes co-leaders with role `member`, and `life_group_id`/`area_id`/`sector_id` in the body are not validated against the actor's scope (a leader can file for another group). Not needed for the read-only scope here; see Open Question Q4.
- PRE-EXISTING MOBILE BUG (not caused by this work, blocks "Novo relatorio"): the mobile `LifeGroupReportForm` payload (`life_group_id, date, attendees, visitors, offerings, observations`) does not match `CreateLifeGroupReportDto` (`area_id, sector_id, life_group_id, committed_members, ...`). The global `ValidationPipe` has `forbidNonWhitelisted: true`, so submission returns 400. In addition `FormDetailViewModel` passes `lifeGroupId = userId` and the form has no life group picker. So the existing Formularios flow cannot "prefill life_group_id" in any useful way and "Novo relatorio" cannot be reused as-is.

## 4. Decisions

### D1 Home card shape
One card component per group: header (group name, role chip optional, chevron) = tap target to group detail; body lines "Lider: X", "Quinta-feira as 20:00" (reuse the same formatting the detail screen uses, `meetingDay`/`meetingTime`, hide missing parts; "Sem dia fixo" shown as-is), "N membros"; divider; "Minhas tarefas" section with that group's upcoming tasks (same filter as today: ASSIGNED, `meetingDate >= today`, soonest first, max 3 per card; each row opens the task guide as today). Section omitted when the group has no tasks. This replaces the standalone tasks card.
- iOS: group header is a `NavigationLink`, task rows are separate `NavigationLink`s (no nested links in one link). Android: header `clickable`, rows `clickable` (siblings).
- Placement: same slot as the old `my_tasks` item (after the ordered backend sections, before the discovery CTA). The discovery CTA (`showLifeGroupDiscoveryCTA`) is unchanged and mutually exclusive with the card.

### D2 Multi-group behaviour (product question Q1)
Default: one card per group, ordered "groups I lead/co-lead first, then by name" (backend order is by name), capped at 3 cards; if more than 3, a text row "Ver todos (N)" opens the existing Life Groups screen (Android `Screen.LifeGroups`, iOS `LifeGroupsView`). Rationale: most users are in exactly one group, a leader who also attends another is the common 2-group case, and one-card-per-group keeps tasks next to the group they belong to without inventing a picker. Tasks whose `lifeGroupId` is not in the fetched groups are not shown (cannot happen under backend rules, groups are a superset).

### D3 Degradation rules
- `getMyLifeGroups()` fails: no group cards, discovery CTA stays hidden (existing rule). Tasks fallback: if tasks loaded OK but groups failed, keep showing the legacy tasks-only card so the existing feature does not regress; this is the only case where the standalone card renders.
- `getMyTasks()` fails: group cards render without the tasks section.
- Both quiet: never set `HomeUiState.error` / iOS `error`. Preserve the existing `CancellationException` rules (rethrow on Android; on iOS treat `CancellationError`/`Task.isCancelled` as "keep current state", per commit 5968b9c).
- Tasks fetch must not be sequentially blocked by groups failing (separate try/catch each).

### D4 Per-group report design
Keep ONE "Relatorios" entry on the leader's life group detail and make it the per-group report hub, reusing what exists:
- Row "Relatorios" (existing, analytics scoped to the group) stays as is.
- NEW row "Relatorios semanais" (leader/co-leader gate) opens NEW screen `LifeGroupReportsScreen/View(lifeGroupId)`: list of this group's weekly reports (date, presentes `committed_members_present`/`committed_members`, convidados, oferta, author), newest first, pull-to-refresh, loading/error/empty/403 states; tap opens a read-only detail (Android route / iOS push or sheet) using the same response fields, with the `leader_attended`/activity arrays rendered as comma lists. Read-only in this scope.
- "Novo relatorio" is NOT built in this scope (see 3.3 PRE-EXISTING MOBILE BUG, Q4). The list shows an empty state "Nenhum relatorio enviado" only.
- Analytics screen tweak (small): when opened with a `lifeGroupId` (both platforms) hide the "Todos os grupos" group dropdown/lock the filter, so the screen is truly scoped to this group and a leader cannot widen it from inside the group.
Tradeoff considered: rewriting the existing "Relatorios" row to open a hub with sub-choices adds a screen with two rows; rejected as extra navigation. Two sibling rows on the detail screen match existing patterns (Presenca, Elegibilidade).

### D5 Gate (who sees the entries)
New helper in each platform's detail view model (pure, unit-testable): `canViewGroupReports = canManageAttendance (this group's leader/co-leader) || role in {admin, pastor, area_leader, sector_leader}`. Notable change from today: a `life_group_leader` viewing ANOTHER group's detail no longer sees "Relatorios" (today `canManage` shows it and the backend answers 403). Area/sector leaders keep seeing it for every group (client cannot know their scope; backend returns 403/404 for out-of-scope groups and both screens already/ will show a clear message). Plain members and `discipler`/`guest` never see it. Backend remains the source of truth.

## 5. Scope: affected files

### Backend (`backend/`, Node 22 available)
Modify:
- `src/life-group-reports/life-group-reports.controller.ts`: add `@SerializeOptions({strategy:'exposeAll', excludeExtraneousValues:false})`; `list(@Req() req, @Query() q: ListLifeGroupReportsQueryDto)`; pass `req.formScope` + `{id: req.user.id}` to `list`, `findOne`, `audit`.
- `src/life-group-reports/life-group-reports.service.ts`: `toResponse()` (snake_case incl. `submitted_by:{id,name}`, `created_at/updated_at/deleted_at`); `list(scope, actor, lifeGroupId?)` extends allowed ids with groups where actor is `leader_id` or `co_leader_id` (same semantics as `LifeGroupAnalyticsService.resolveLifeGroupIds`; unrestricted stays unrestricted; `life_group_id` filter outside the allowed set => 403 `ForbiddenException`, same as analytics); `findEntity(id, scope?, actor?)` scope-aware (in scope OR actor is leader/co-leader of `lifeGroupId` OR actor is submitter, else `NotFoundException`); internal `update`/`softDelete` keep the unscoped load (their own policy applies). `update` response and `create` response also go through `toResponse`.
- `src/life-group-reports/life-group-reports.module.ts`: only if `EntityManager`/`LifeGroup` repository injection is needed (use `@InjectEntityManager()` like analytics; no module change expected).
Create:
- `src/life-group-reports/dto/list-life-group-reports-query.dto.ts`: `life_group_id?: number` with `@Expose() @IsOptional() @Type(() => Number) @IsInt() @Min(1)` (the `@Expose` is mandatory, see `life-group-analytics.controller.spec.ts` regression).
- `src/life-group-reports/life-group-reports.service.spec.ts`, `life-group-reports.controller.spec.ts`.
No migrations, no new endpoints (one new optional query param), no role-slug changes. Update `.ai/features/life-groups.md` + `forms.md`, and Postman collection (`admin-ui/postman`) for the `life_group_id` param.
Optional follow-up (not in this scope): share `resolveLifeGroupIds` logic between analytics and reports (small duplication accepted to keep the diff reviewable).

### Shared KMP (`kmp-mobile/shared`)
- `domain/model/LifeGroupReport.kt` (new): `LifeGroupWeeklyReport` DTO/domain (snake_case `@SerialName`).
- `domain/repository/LifeGroupReportRepository.kt` + `data/repository/LifeGroupReportRepositoryImpl.kt` (new): `getReports(lifeGroupId: Int)` -> `GET api/forms/life-group-reports?life_group_id=`, `getReport(id)` -> `GET api/forms/life-group-reports/{id}`. Koin binding in `di/SharedModule.kt`; iOS exposure in `iosMain/.../IosAppContainer.kt` (`lifeGroupReportRepository`). Follow `LifeGroupAnalyticsRepositoryImpl`/`LifeGroupAttendanceRepositoryImpl` as the template. If the Phase 0 serialization check shows the list endpoint is also consumed elsewhere, keep unknown JSON keys ignored (default client setting).
- Do NOT touch `submitLifeGroupReport`/`LifeGroupReportForm` (out of scope; Q4).
- New pure function in shared `commonMain` (`domain/model/HomeLifeGroupCard.kt`): `buildHomeLifeGroupCards(currentUserId, groups, tasks, today, maxCards=3, maxTasks=3): HomeLifeGroupCards(cards, hiddenCount)`, unit-tested once in `commonTest` and called from both HomeViewModels, so the Kotlin and Swift sides cannot drift. Keep `selectUpcomingTasks` (Android) and `upcomingTasks` (iOS) as thin wrappers or migrate their existing tests.

### Android (`kmp-mobile/android`)
- `ui/features/home/HomeViewModel.kt`, `HomeUiState.kt`: store `lifeGroupCards`, `hiddenLifeGroupsCount`, `legacyTasks` (fallback only); keep `showLifeGroupDiscoveryCTA`; new effect `NavigateToLifeGroup(id)` and `NavigateToAllLifeGroups`.
- `ui/features/home/HomeScreen.kt`: replace `my_tasks` item with `life_group_cards` items (new private `LifeGroupHomeCard`), "Ver todos" row, keep legacy `MyTasksCard` for the fallback. Extract the task rows from `MyTasksCard` into a reusable `MyTasksSection` (in `ministries/`) used by both the card and the detail screen to avoid copy-paste.
- `ui/features/ministries/MinistryDetailScreen.kt`, `MinistryDetailViewModel.kt` (LifeGroupDetail*), `MinistryDetailUiState.kt`: add `canViewGroupReports`, new row "Relatorios semanais", change the existing "Relatorios" row gate to `canViewGroupReports`.
- New `ui/features/lifegroupreports/` : `LifeGroupReportsScreen`, `LifeGroupReportsViewModel` (UDF `UiState`/`UiEffect`), `LifeGroupReportDetailScreen` (+VM or state-hoisted), `LifeGroupReportsUiState.kt`.
- `navigation/Screen.kt` (+ `life_group_reports/{lifeGroupId}`, `life_group_report/{reportId}`), `navigation/PazNavGraph.kt`, `di/AndroidModule.kt`.
- `ui/features/lifegroupanalytics/LifeGroupAnalyticsScreen.kt` (+VM): hide the group dropdown when launched with a `lifeGroupId`.

### iOS (`kmp-mobile/ios`, pbxproj is hand-maintained or generated via xcodegen: check `project.yml`; PazChurchTests target now exists)
- `Features/Home/HomeViewModel.swift`, `HomeView.swift`: same model as Android; new `LifeGroupHomeCard` view in `Features/Home/` (or `Features/LifeGroupTasks/`); reuse `LifeGroupMyTasksCard` rows via a `LifeGroupTaskRows` extraction; legacy fallback.
- `Features/Ministries/MinistryDetailView.swift` (`LifeGroupDetailView`): `canViewGroupReports`, new NavigationLink row "Relatorios semanais", re-gate existing "Relatorios".
- New `Features/LifeGroupReports/`: `LifeGroupReportsView`, `LifeGroupReportsViewModel` (`@Observable @MainActor`), `LifeGroupReportDetailView`.
- `Features/LifeGroupAnalytics/LifeGroupAnalyticsView.swift` (+VM): hide group picker when scoped.
- `project.pbxproj`/`project.yml`: add the new source files (verify they are picked up; if the repo hand-edits the pbxproj follow `.ai/apps/mobile.md` note).
- Tests in `PazChurchTests/`.

## 6. Tests per layer

Backend (jest, new specs):
- service: list unrestricted/admin; scoped area/sector leader; life_group_leader; co-leader with role `member` (via co_leader_id fallback) sees only their group's reports; plain member gets empty; `life_group_id` filter allowed vs out-of-scope => 403; leader of 2 groups sees both.
- service: `findOne` in scope OK; out of scope => 404; submitter always OK; leader/co-leader of that group OK; admin OK; `audit` same.
- service: `toResponse` snake_case shape incl. `submitted_by`, offering as string.
- controller (Nest app with `GLOBAL_VALIDATION_PIPE_OPTIONS` + real `ClassSerializerInterceptor` config from main.ts, pattern of `life-group-analytics.controller.spec.ts`): `?life_group_id=3` reaches the service as number 3 (DTO `@Expose` regression), and the JSON body is NOT `{}` (Phase 0 characterization test written first against the unmodified code to prove/disprove the serialization bug).
Shared (`commonTest`): `LifeGroupReportRepositoryTest` (Ktor mock engine like `LifeGroupAnalyticsRepositoryTest`: URL/query, snake_case parse, error mapping); `buildHomeLifeGroupCards` (0/1/2/4 groups, ordering leader-first, task folding by lifeGroupId, per-card task cap/filter/sort, hiddenCount, orphan tasks dropped).
Android (`android/src/test`): `HomeViewModelTest` (cards built; groups fail + tasks ok => legacy fallback, no error; tasks fail => cards without tasks; no groups => discovery CTA and no cards; cancellation rethrown; tap effects); `LifeGroupDetailViewModelTest` (`canViewGroupReports` matrix: leader, co-leader with role member, leader of another group, admin, pastor, area/sector leader, member); new `LifeGroupReportsViewModelTest` (loading/success/empty/403/error/refresh, detail open).
iOS (`PazChurchTests`, XCTest like the existing files): `HomeViewModelTests` extended for the card builder wrapper and fallback state; new `LifeGroupReportsViewModelTests` with a fake repository; `canViewGroupReports` pure static (like `DeepLinkDestination.from`), non-private for testability.
Not unit-testable: Compose/SwiftUI layout (covered by build + manual QA checklist below).

## 7. Validation plan

Local:
- Backend: `export PATH=/private/tmp/claude-501/-Users-jplima-sword-Developer-Personal-paz-monorepo/9b7529fb-874e-44fd-8bd1-e92ef3771aaf/scratchpad/node-dl/node-v22.23.3-darwin-arm64/bin:$PATH; cd backend && npx jest src/life-group-reports src/life-group-analytics src/life-group-attendance && npm run lint && npm run build` then full `npm run test`.
- Shared: `JAVA_HOME=<scratchpad/jdk-dl 17> ./gradlew :shared:allTests` (and `:shared:assembleXCFramework` / the Gradle prebuild the iOS target already uses) in `kmp-mobile`.
- iOS: `xcodebuild -project ios/PazChurch.xcodeproj -scheme PazChurch -destination 'platform=iOS Simulator,...' build` and `xcodebuild test ... -only-testing:PazChurchTests` (Xcode 26.6). Run swiftformat/swiftlint if installed.
- Android: SDK NOT installed locally, so `:android:assembleDebug`, `:android:testDebugUnitTest`, `ktlintFormat` run only in CI; mitigate by keeping Android Kotlin changes small, reusing existing components, running `:shared` tests locally, and reviewing Android diff carefully for compile errors (imports, `internal` visibility, route args). Run ktlint via Gradle only if possible without the SDK; otherwise note as not run.
CI covers Android/iOS builds.
Manual QA checklist (staging, for the human gate): user with 0 groups (CTA only), 1 group with/without tasks, leader+member of 2 groups, 4 groups ("Ver todos"), offline/failure on `/life-groups/me` and on `/me/life-group-tasks`; co-leader (role member) sees "Relatorios" + "Relatorios semanais" with data; plain member sees neither; leader of group A on group B detail sees neither; direct GET of another group's report id as member => 404.

## 8. Phases (each an independent commit)

0. Characterization: backend spec proving the current `GET /forms/life-group-reports` serialization and the missing scope checks (tests expected to FAIL/expose gaps are written first; record result in progress.md).
1. Backend: mapper + `SerializeOptions`, scoped list with leader/co-leader fallback and `life_group_id` filter, scope-aware `findOne`/`audit`, specs, docs, Postman.
2. Shared: `LifeGroupReportRepository` + models + DI + iOS container, `buildHomeLifeGroupCards` + tests.
3. Home card Android + iOS (fold tasks, multi-group, fallback) + tests.
4. Detail screens: `canViewGroupReports`, "Relatorios semanais" list + detail on both platforms, analytics scoped-mode tweak + tests.
5. Docs: `.ai/features/life-groups.md`, `forms.md`, `mobile-app.md`, `apps/mobile.md` (also fix the stale "no iOS unit-test target" paragraph: `PazChurchTests` exists), `.pipeline/changes.md`.
Backend must ship before the mobile list screen is useful; the app handles an old backend by showing the error state.

## 9. Risks

- Phase 1 changes the response shape of `GET /forms/life-group-reports` if it currently returns camelCase/`{}`: admin-ui expects snake_case so it should improve; confirm in Phase 0 and check `admin-ui/app/(dashboard)/formularios/[slug]/page.tsx` still renders (column keys already snake_case).
- Hiding "Relatorios" from a `life_group_leader` on other groups changes current behaviour (today it shows then 403s). Intentional.
- Android cannot be compiled locally: higher regression risk, rely on CI and keep diffs small.
- iOS nested navigation links in the home card (separate links per row) and pbxproj file registration for new Swift files.
- Home now keeps the full groups list in state: payload includes `members` for the viewer's groups (already fetched today and discarded); fine, but do not render roster on the card.
- `meetingTime` format/"Sem dia fixo" display: reuse the detail screen formatting to stay consistent.
- Leader-of-N-groups scope in `ScopeResolver` (`findOne`) is left as is; the new fallback covers reports only. Other forms still have that limitation (note for later).
- Account deletion/privacy: report list exposes offering and attendance of the group to its co-leader; same data the leader already sees, acceptable.

## 10. OPEN QUESTIONS (product) - none blocks Phases 0-3; Q2/Q3/Q4 shape Phase 4

Q1 Multi-group: confirm "one card per group, max 3, then Ver todos" (alternative: a single card for the group with the nearest meeting plus "e mais N grupos"). Should leader/co-leader groups be ordered first?
Q2 What is "the report" for a leader? This spec delivers BOTH the existing attendance/analytics view (already per group) and a read-only list of the group's weekly reports (form `life-group-reports`). Confirm both, or only one (and which label: "Relatorios" vs "Relatorio semanal").
Q3 Should area/sector leaders and admin/pastor see the report entries on every group they open (spec: yes, backend decides scope), or only the group's own leader/co-leader?
Q4 "Novo relatorio" from inside the group: not included because the mobile weekly-report submission is currently broken (payload does not match backend DTO, 400 with `forbidNonWhitelisted`, no group picker, `lifeGroupId = userId` bug) and a co-leader with role `member` is blocked by `@Roles` on create. Do you want a follow-up ticket to rebuild that form (fields from the admin form: committed members/present, kids, guests, MDAs, offering, Tadel/Culto, leader attended, disciples, pastoring/training activity), prefilled with this group's id/area/sector, and to allow co-leaders to create? Needs the exact field list/labels from product.
Q5 Should plain members also see a lightweight read-only summary of their group (e.g. next meeting) beyond the home card? (Assumed no.)
Q6 Task section on the card: max 3 tasks per card OK, or only the next one?
