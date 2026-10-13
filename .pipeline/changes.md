# Changes: Phase 3 shared + Android (combined "Reunião" screen)

Branch `feat/life-group-meeting-screen`, stacked on PR #96 (`feat/life-group-meetings-api`, 123e5f0). No backend change.

## Shared (`kmp-mobile/shared`)
- New: `domain/model/LifeGroupMeeting.kt` (models, report input/draft/validation, local draft, history summary), `domain/model/LifeGroupMeetingRules.kt` (`LifeGroupMeetingRules`, `LifeGroupMeetingErrors`), `domain/repository/LifeGroupMeetingRepository.kt` (+ `LifeGroupMeetingException`, `MeetingDraftStore`), `data/repository/LifeGroupMeetingRepositoryImpl.kt`, `data/repository/MeetingDraftStorage.kt` (+ `MeetingDraftStore.android.kt` DataStore, `MeetingDraftStore.ios.kt` NSUserDefaults).
- Changed: `AuthRepositoryImpl` (optional `meetingDraftStore`, wiped on logout), `SharedModule`, `IosAppContainer` (`lifeGroupMeetingRepository`, `meetingDraftStore`), `LifeGroupReportRepositoryImpl` (report DTOs `internal` for reuse).
- Tests: `LifeGroupMeetingRulesTest`, `LifeGroupMeetingReportDraftTest`, `LifeGroupMeetingRepositoryTest`, `MeetingDraftStorageTest`, `AuthRepositoryTest` (+logout wipes drafts), `FakeMeetingDraftStore`.

## Android (`kmp-mobile/android`)
- New package `ui/features/lifegroupmeeting/`: `LifeGroupMeetingScreen`, `LifeGroupMeetingViewModel`, `LifeGroupMeetingUiState`, `LifeGroupMeetingHistoryScreen`, `LifeGroupMeetingHistoryViewModel`, `MeetingDates`.
- Nav: `Screen.LifeGroupMeetings`, `Screen.LifeGroupMeeting`, `LifeGroupAttendanceEditor` kept as alias of the same screen (push `paz://presenca/{id}/{date}` unchanged); `PazNavGraph`; Koin in `AndroidModule`.
- `MinistryDetailScreen`: "Presença" card replaced by "Reuniões" (gate `canViewGroupReports`).
- Removed: `ui/features/lifegroupattendance/*` (editor, history, ui state, view models).
- Tests: `LifeGroupMeetingViewModelTest` (22), `LifeGroupMeetingHistoryViewModelTest` (7), `MeetingDatesTest`, `FakeMeetingDraftStore`.

## Docs
`.ai/features/life-groups.md`, `.ai/features/mobile-app.md`, `.ai/apps/mobile.md`.

## Decisions / flags
- Phase 0 standalone report form is NOT in this base (lives on `fix/life-group-report-submit`), so no "Enviar relatório" row existed here to remove and the Formulários entry / `paz://form/life-group-reports` are untouched. Phase 0's `LifeGroupReportRules` parsers are mirrored (not imported) in `LifeGroupMeetingRules`: consolidate after both merge.
- History is a separate screen opened from the "Reuniões" card (not an inline list in the detail screen), to avoid adding two more network calls to the detail view model.
- Report multi-values: Tadel/Culto chips + free text (option lists are still design Q8).

## Phase 3 iOS (`kmp-mobile/ios`)
- New `PazChurch/Features/LifeGroupMeeting/`: `LifeGroupMeetingServices` (Swift seams over the shared repository/draft store/history endpoints, error mapping via `LifeGroupMeetingErrors`, `LifeGroupMeetingReportDraft` helpers, ISO date helpers), `LifeGroupMeetingViewModel`, `LifeGroupMeetingHistoryViewModel`, `LifeGroupMeetingView` (+ `...AttendanceSection`, `...ReportSection`, `...Components`), `LifeGroupMeetingHistoryView` ("Reuniões" list + "Nova reunião" date-picker sheet).
- `MinistryDetailView.swift` (`LifeGroupDetailView`): "Presença" row replaced by "Reuniões" (gate `canViewGroupReports`, as on Android; was `canManageAttendance`).
- `paz://presenca/{id}/{date}`: `DeepLinkDestination.lifeGroupAttendanceEditor` case name and parsing/allowlist kept; `MainTabView` now renders `LifeGroupMeetingDeepLinkView` (replaces `LifeGroupAttendanceEditorDeepLinkView`).
- Removed `Features/LifeGroupAttendance/*` (editor, history, view models; no remaining references, analytics unaffected). `project.pbxproj` hand-edited (old group removed, new `LifeGroupMeeting` group + test file; `plutil -lint` OK); `project.yml` needs no change (directory sources).
- Tests: `PazChurchTests/LifeGroupMeetingViewModelTests.swift` (23 tests).
- Docs: `.ai/features/life-groups.md`, `.ai/features/mobile-app.md`, `.ai/apps/mobile.md`.
- Decisions/flags: (1) iOS history row gate widened from `canManageAttendance` to `canViewGroupReports` (user instruction / Android parity): admin/pastor/area/sector leaders now see "Reuniões". (2) The old per-group meetingDay comes from the group already in `LifeGroupDetailView` (no extra church repository call, unlike Android). (3) After an `edit_window_closed` save error the reload replaces the inline error with the read-only banner (Android parity). (4) Draft writes are fire-and-forget Tasks chained in order.
