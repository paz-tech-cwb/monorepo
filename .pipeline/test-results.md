# Test results: Reunioes UX

- `./gradlew :shared:iosSimulatorArm64Test --offline` (JDK 17): EXIT=0 (error kinds/messages, entry resolver, hasNoRecord, report-only rows, attendance summary, home layout, repository 404 body + overview param).
- Android unit tests added/updated (LifeGroupMeetingViewModelTest, LifeGroupMeetingHistoryViewModelTest, LifeGroupMeetingEntryViewModelTest, LifeGroupAnalyticsViewModelTest, FormulariosViewModelTest): NOT run locally (Android SDK not installed); CI on the draft PR is the signal.
- Removed tests: LifeGroupReportFormViewModelTest, LifeGroupReportsViewModelTest (code removed).

## iOS
- `./gradlew :shared:iosSimulatorArm64Test --offline` after the shared removals: EXIT=0. `:shared:assembleSharedDebugXCFramework`: OK.
- `xcodebuild test -only-testing:PazChurchTests` on simulator "TestPhone" (temporary fake `GoogleService-Info.plist`, deleted afterwards, never committed): 94 tests, 0 failures (new: `LifeGroupReunioesUXTests` 4 suites).
- Not verified locally: on-device/simulator layout of the screens (single background, segmented tab, Home card), Android compile (CI only).

## Review fixes (reunioes ux)
- `:shared:iosSimulatorArm64Test --offline`: EXIT=0 (new: summary card copy, led+supervised entry, error code passthrough, `httpErrorCodeOrNull`; one entry test updated for led+supervised).
- `:shared:assembleSharedDebugXCFramework`: OK.
- `xcodebuild test` PazChurchTests on "TestPhone" (temporary fake `GoogleService-Info.plist`, deleted, never committed): 97 tests, 0 failures (new: entry load-once/keep-on-failed-refresh, led+supervised, code passthrough).
- Android (new/changed `LifeGroupMeetingEntryViewModelTest`): not run locally, CI is the signal.
