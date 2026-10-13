# Test results: Reunioes UX

- `./gradlew :shared:iosSimulatorArm64Test --offline` (JDK 17): EXIT=0 (error kinds/messages, entry resolver, hasNoRecord, report-only rows, attendance summary, home layout, repository 404 body + overview param).
- Android unit tests added/updated (LifeGroupMeetingViewModelTest, LifeGroupMeetingHistoryViewModelTest, LifeGroupMeetingEntryViewModelTest, LifeGroupAnalyticsViewModelTest, FormulariosViewModelTest): NOT run locally (Android SDK not installed); CI on the draft PR is the signal.
- Removed tests: LifeGroupReportFormViewModelTest, LifeGroupReportsViewModelTest (code removed).
