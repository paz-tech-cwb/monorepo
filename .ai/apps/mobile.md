# App: Mobile

## Workstreams

| Path | Stack | Notes |
|---|---|---|
| `kmp-mobile/` | Kotlin Multiplatform, Android/iOS | Member-facing mobile app |

## Responsibilities

- Member authentication and token refresh.
- Member journey, forms, notifications, ministries, academy, life group UX.
- Push notification tap/deep-link handling.

## Life group tasks

Shared domain/repository in `kmp-mobile/shared` (`LifeGroupTaskRepository`),
Android screens in `ui/features/lifegrouptasks/`, iOS in
`ios/PazChurch/Features/LifeGroupTasks/` (pbxproj hand-edited; iOS build/bridging not verified here).
Deep link `paz://tarefa/{assignmentId}`. See `features/mobile-app.md`.

## Life group home card and weekly reports

Shared: `LifeGroupReportRepository`, `LifeGroupWeeklyReport`, `buildHomeLifeGroupCards` (`:shared`, commonTest covered).
Android: `ui/features/home/` (group cards folding tasks, legacy tasks fallback), `ui/features/ministries/` (`canViewGroupReports`; rows Reuniões, Membros, Estudo do Life, Elegibilidade), `ui/features/lifegroupmeeting/` (Reuniões with the [Reuniões | Relatórios] tabs, Reunião screen, entry/picker), `ui/features/lifegroupanalytics/` (`LifeGroupAnalyticsPanel`, scoped mode); the former `ui/features/lifegroupreports/` package (submit form, list, detail) was removed. iOS: `Features/Home/` (`LifeGroupHomeCard`, `HomeViewModel.resolveLifeGroups`), `Features/Ministries/MinistryDetailView.swift` (`LifeGroupDetailView.canViewGroupReports`, "Relatórios semanais" row), `Features/LifeGroupReports/` (list + read-only detail), analytics scoped mode (`isScopedToGroup`). Android could not be compiled locally (no SDK); CI validates; iOS built and unit-tested locally. See `features/mobile-app.md`.

Weekly report submit (Phase 0; admin/pastor are offered all groups via `LifeGroupReportRules.resolveGroups`, VM takes `AuthRepository`): `:shared` `LifeGroupReportDraft`/`LifeGroupReportRules`/`LifeGroupReportForm` (domain/model), `FormsRepository.submitLifeGroupReport`; Android `ui/features/lifegroupreports/LifeGroupReportForm*` (+ `Screen.LifeGroupReportSubmit`, `PazNavGraph` redirect for formId `life-group-reports`); iOS `Features/LifeGroupReports/LifeGroupReportForm*` (+ `FormDestinationView`, hand-edited `project.pbxproj`; xcodegen is not used to regenerate). Tests: shared `LifeGroupReportDraftTest`, `FormsRepositoryLifeGroupReportTest`; Android `LifeGroupReportFormViewModelTest`; iOS `LifeGroupReportFormTests`.

## Agent rules

- Read kmp-mobile's local docs/build files before proposing changes.
- Keep mobile routes aligned with notification categories and deep links.

## Validation

KMP:

Read kmp-mobile's docs/build files first, then run the smallest relevant Gradle/Xcode checks.

Home life group cards (tasks folded in): Android `HomeViewModel` (shared `buildHomeLifeGroupCards`, `MyTasksRows` reused from the detail screen; legacy `MyTasksCard` only as fallback) and iOS `HomeViewModel.resolveLifeGroups` (same shared builder) + `LifeGroupHomeCard` (header and task rows are sibling `NavigationLink`s; `LifeGroupTaskRows` reused from `LifeGroupMyTasksCard`, which remains the legacy fallback).

iOS tests: the `PazChurchTests` unit-test target (XCTest, hosted in the app, `bundle.unit-test` in `project.yml`, registered by hand in `project.pbxproj` because xcodegen is not installed; new source files under `PazChurch/` are picked up by `project.yml` automatically but must be added to the pbxproj manually, then `plutil -lint`). Covered: deep links, task markdown, `HomeViewModel` (task selection, `resolveLifeGroups` cards/fallback/discovery CTA, meeting label) and `LifeGroupMeetingViewModelTests` (meeting + history view models with fakes) and `LifeGroupReportsTests` (`canViewGroupReports` matrix, 403/404 mapping, formatting, view models via a fake `LifeGroupReportRepository`). Run: build the XCFramework (`./gradlew :shared:assembleSharedDebugXCFramework` in `kmp-mobile`), then `xcodebuild -project ios/PazChurch.xcodeproj -scheme PazChurch -destination 'platform=iOS Simulator,name=<sim>' CODE_SIGNING_ALLOWED=NO test`. The app host calls `FirebaseApp.configure()`, and `ios/PazChurch/GoogleService-Info.plist` is gitignored, so a fresh checkout needs a real (or syntactically valid fake, never committed) plist to build and run the tests.

## Life group meetings (Reunião screen)

- `:shared`: `LifeGroupMeetingRepository` + `LifeGroupMeetingRepositoryImpl`, `LifeGroupMeetingRules`/`LifeGroupMeetingErrors` (pure, `commonTest`), `MeetingDraftStore` (expect/actual `createMeetingDraftStore`, wired in `SharedModule` and `IosAppContainer.meetingDraftStore`/`lifeGroupMeetingRepository`; `AuthRepositoryImpl` takes the store to wipe drafts on logout).
- Android: `LifeGroupMeetingViewModel` / `LifeGroupMeetingHistoryViewModel` (+ screens) in `ui/features/lifegroupmeeting/`; Koin `viewModel { (lifeGroupId: Int, date: String) -> LifeGroupMeetingViewModel(...) }`; nav routes in `Screen.kt` (`LifeGroupMeetings`, `LifeGroupMeeting`, legacy `LifeGroupAttendanceEditor` alias) and `PazNavGraph.kt`; the legacy `lifegroupattendance/` package was removed.
- iOS: `Features/LifeGroupMeeting/` (`@Observable @MainActor` `LifeGroupMeetingViewModel` / `LifeGroupMeetingHistoryViewModel` over small Swift protocols `LifeGroupMeetingService`, `LifeGroupMeetingDraftStoring`, `LifeGroupMeetingHistorySource` that the production adapters back with `IosAppContainer.lifeGroupMeetingRepository` / `meetingDraftStore` so tests can use fakes); deep link view `LifeGroupMeetingDeepLinkView` in `Navigation/DeepLinkViews.swift`; the legacy `Features/LifeGroupAttendance/` folder was removed (pbxproj hand-edited). Covered by `LifeGroupMeetingViewModelTests` (draft restore/keying, save order and report lock, error mapping, read-only, extra-meeting flow, history merge, dates, presenca deep link).
- Swift naming for the iOS port: Kotlin enum cases are lowerCamelCase (`MeetingReportBlockedReason.groupHasNoSector`), `LifeGroupMeetingReportDraft.kids0To11` stays `kids0To11`, Kotlin `Int?`/`Boolean?` parameters become `KotlinInt?`/`KotlinBoolean?`, `@Throws(LifeGroupMeetingException::class, Exception::class)` surfaces the exception as `NSError` whose `kotlinException` is the `LifeGroupMeetingException`.
- Supervisors are read-only (D11): `LifeGroupMeetingRules.canWrite(role, isGroupLeadership)` (shared, pure, tested; admin, pastor, or this group's leader/co-leader by id) is resolved once by the group detail (`MinistryDetailViewModel.canWriteMeetings` / `MinistryDetailView.canWriteMeetings`) and handed to the history (`canWrite`, default false) and on to the meeting screen (route arg `canWrite`, `viewerCanWrite`; unknown/null for the `paz://presenca` deep link). The "Reuniões" card, history and meeting stay visible to every `canViewGroupReports` user; for supervisors there is no "Nova reunião", no "Reunião extra" switch, no "Todos presentes", no save buttons and the toggles are disabled, with a "Somente leitura" banner. Effective rule: `LifeGroupMeeting.isEditable = canWrite && canEdit` (server `can_write` missing => false, so a missing flag is safe) and a `false` role hint forces read-only; a supervisor opening a date with no record sees "Não há reunião registrada nesta data" instead of the extra-meeting switch. The server stays the authority (403 `meeting_write_forbidden`).
- Local verification note: the Android SDK is not installed on the authoring machine; Android code is compile-checked only through a scratch JVM/Compose-desktop project and CI after push.

## Reuniões UX (Android now, iOS follows)

- Group detail rows: Reuniões, Membros, Estudo do Life, Elegibilidade (leader/co-leader). Reuniões = segmented [Reuniões | Relatórios]; Relatórios = `LifeGroupAnalyticsPanel(viewModel scoped to the group)`.
- Entry from Formulários / `paz://form/life-group-reports`: `LifeGroupMeetingRules.resolveEntry` (shared) -> `LifeGroupMeetingEntryScreen` (Android route `life_group_meeting_entry`).
- Errors/empty states: `LifeGroupMeetingErrors.kind` (`Kind.GROUP_NOT_FOUND | SERVER_UNAVAILABLE | NO_PERMISSION | SESSION_EXPIRED | OFFLINE | OTHER`), `isRetryable`, `messageForHttpStatus`; `LifeGroupMeeting.hasNoRecord`; `LifeGroupMeetingSummary.isReportOnly`.
- Home: single "Meus grupos" card, `homeLifeGroupsLayout(groupCount)`.
- Swift naming: `LifeGroupMeetingErrors.Kind` is a nested Kotlin enum -> `LifeGroupMeetingErrors.Kind.groupNotFound` (check the generated header: nested types of an `object` appear as `LifeGroupMeetingErrorsKind` in ObjC/Swift; if unsure use `message`/`isRetryable`, which are plain functions). `homeLifeGroupsLayout` is a top-level function in `HomeLifeGroupCardKt`; `summarizeAttendance` is an extension in `LifeGroupAnalyticsKt` (`LifeGroupAnalyticsKt.summarizeAttendance(rows)`). `Throwable.anyHttpStatusCodeOrNull` is Kotlin-only (Ktor type).
