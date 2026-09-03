# Home & Account UI Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix navigation bars, events carousel, image caching, agenda calendar, agenda tap navigation, profile edit access, and backend section ordering across the KMP iOS app.

**Architecture:** All changes are iOS-side Swift (SwiftUI views) except Task 1 (add Kingfisher SPM dep) and Task 9 (KMP shared Kotlin). No new files are created — all tasks modify existing files. Tasks 1–2 are prerequisites for Tasks 3–5; all other tasks are independent.

**Tech Stack:** SwiftUI, Kingfisher (SPM), KMP Shared (Kotlin/kotlinx.serialization)

---

## File Map

| File | Tasks |
|------|-------|
| `ios/PazChurch.xcodeproj` | Task 1 — add Kingfisher SPM |
| `ios/PazChurch/Features/Home/HomeView.swift` | Tasks 3, 5, 6, 7 |
| `ios/PazChurch/Features/Agenda/AgendaDetailView.swift` | Task 2 |
| `ios/PazChurch/Features/Agenda/AgendaListView.swift` | Tasks 2, 8 |
| `ios/PazChurch/Features/MemberJourney/MemberJourneyView.swift` | Task 8 |
| `ios/PazChurch/Features/MeetingReport/MeetingReportView.swift` | Task 8 |
| `ios/PazChurch/Features/Formularios/FormulariosView.swift` | Task 8 |
| `ios/PazChurch/Features/Profile/ProfileView.swift` | Task 8 |
| `ios/PazChurch/Features/Account/AccountView.swift` | Task 4 |
| `shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/HomeContent.kt` | Task 9 |
| `shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/HomeRepositoryImpl.kt` | Task 9 |

---

## Task 1: Add Kingfisher via Swift Package Manager

**Files:**
- Modify: `ios/PazChurch.xcodeproj` (Xcode SPM packages)

- [ ] **Step 1: Add Kingfisher package in Xcode**

Open `ios/PazChurch.xcodeproj` in Xcode. Go to **File → Add Package Dependencies…** and enter:
```
https://github.com/onevcat/Kingfisher.git
```
Select version rule: **Up to Next Major** from `8.0.0`. Add to the `PazChurch` target.

- [ ] **Step 2: Verify it builds**

```bash
cd ios && xcodebuild -scheme PazChurch -destination 'generic/platform=iOS Simulator' build 2>&1 | tail -5
```
Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 3: Commit**

```bash
cd ios && git add PazChurch.xcodeproj
cd .. && git commit -m "chore(ios): add Kingfisher SPM dependency"
```

---

## Task 2: Replace AsyncImage with KFImage (Kingfisher caching)

**Files:**
- Modify: `ios/PazChurch/Features/Agenda/AgendaDetailView.swift`
- Modify: `ios/PazChurch/Features/Agenda/AgendaListView.swift`

- [ ] **Step 1: Update AgendaDetailView hero image**

In `AgendaDetailView.swift`, add `import Kingfisher` at the top.

Replace the `heroArea` computed property's image block:

```swift
// BEFORE
if let imageUrl = event.imageUrl, !imageUrl.isEmpty, let url = URL(string: imageUrl) {
    AsyncImage(url: url) { img in
        img.resizable().scaledToFill()
    } placeholder: {
        PazColors.heroGradient
    }
    .frame(height: 300)
    .clipped()
    .overlay(LinearGradient(colors: [.black.opacity(0.3), .black.opacity(0.7)], startPoint: .top, endPoint: .bottom))
}
```

```swift
// AFTER
if let imageUrl = event.imageUrl, !imageUrl.isEmpty, let url = URL(string: imageUrl) {
    KFImage(url)
        .resizable()
        .placeholder { PazColors.heroGradient }
        .fade(duration: 0.2)
        .scaledToFill()
        .frame(height: 300)
        .clipped()
        .overlay(LinearGradient(colors: [.black.opacity(0.3), .black.opacity(0.7)], startPoint: .top, endPoint: .bottom))
}
```

- [ ] **Step 2: Update AgendaListView thumbnail**

In `AgendaListView.swift`, add `import Kingfisher` at the top.

In `AgendaEventRow.dateBox`, replace the `AsyncImage` block:

```swift
// BEFORE
AsyncImage(url: url) { img in
    img.resizable().scaledToFill()
} placeholder: {
    PazColors.pazPrimary.opacity(0.08)
}
.frame(width: 52, height: 52)
.clipShape(RoundedRectangle(cornerRadius: 12))
```

```swift
// AFTER
KFImage(url)
    .resizable()
    .placeholder { PazColors.pazPrimary.opacity(0.08) }
    .fade(duration: 0.2)
    .scaledToFill()
    .frame(width: 52, height: 52)
    .clipShape(RoundedRectangle(cornerRadius: 12))
```

- [ ] **Step 3: Build to verify**

```bash
cd ios && xcodebuild -scheme PazChurch -destination 'generic/platform=iOS Simulator' build 2>&1 | tail -5
```
Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 4: Commit**

```bash
git add ios/PazChurch/Features/Agenda/AgendaDetailView.swift \
        ios/PazChurch/Features/Agenda/AgendaListView.swift
git commit -m "feat(ios): replace AsyncImage with KFImage for disk caching"
```

---

## Task 3: Events Carousel — Image, Peek, Auto-scroll

**Files:**
- Modify: `ios/PazChurch/Features/Home/HomeView.swift`

- [ ] **Step 1: Add import and auto-scroll state**

In `HomeView.swift`, add `import Kingfisher` at the top alongside `import SwiftUI`.

Add a timer state property inside `HomeView`:
```swift
@State private var autoScrollTimer: Timer? = nil
@State private var isUserDragging: Bool = false
```

- [ ] **Step 2: Replace featuredSection**

Replace the entire `featuredSection` computed property:

```swift
private var featuredSection: some View {
    let count = banners.count
    return TabView(selection: $currentFeatureIndex) {
        ForEach(Array(banners.enumerated()), id: \.offset) { index, banner in
            FeaturedCardView(
                title: banner.title,
                imageUrl: banner.imageUrl,
                isAlt: index % 2 == 1
            )
            .padding(.horizontal, 18)
            .padding(.trailing, count > 1 ? 44 : 0)
            .padding(.bottom, 60)
            .tag(index)
        }
    }
    .frame(height: 240)
    .tabViewStyle(.page(indexDisplayMode: .never))
    .tint(.primary)
    .onAppear { startAutoScroll() }
    .onDisappear { stopAutoScroll() }
    .onChange(of: currentFeatureIndex) { _, _ in
        if isUserDragging { resetAutoScroll() }
    }
    .simultaneousGesture(
        DragGesture()
            .onChanged { _ in isUserDragging = true }
            .onEnded { _ in
                isUserDragging = false
                resetAutoScroll()
            }
    )
}

private func startAutoScroll() {
    guard banners.count > 1 else { return }
    autoScrollTimer = Timer.scheduledTimer(withTimeInterval: 3, repeats: true) { _ in
        withAnimation(.easeInOut) {
            currentFeatureIndex = (currentFeatureIndex + 1) % banners.count
        }
    }
}

private func stopAutoScroll() {
    autoScrollTimer?.invalidate()
    autoScrollTimer = nil
}

private func resetAutoScroll() {
    stopAutoScroll()
    startAutoScroll()
}
```

- [ ] **Step 3: Update FeaturedCardView to accept and show imageUrl**

Replace the `FeaturedCardView` struct:

```swift
private struct FeaturedCardView: View {
    let title: String
    let imageUrl: String
    let isAlt: Bool

    private var gradient: LinearGradient {
        isAlt ? PazColors.featuredCardGradient : PazColors.featuredCardGradientAlt
    }

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            if !imageUrl.isEmpty, let url = URL(string: imageUrl) {
                KFImage(url)
                    .resizable()
                    .placeholder { gradient }
                    .fade(duration: 0.2)
                    .scaledToFill()
                    .overlay(
                        LinearGradient(
                            colors: [.clear, .black.opacity(0.6)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
            } else {
                gradient

                CrossWatermarkView()
                    .frame(width: 158, height: 158)
                    .opacity(0.08)
                    .rotationEffect(.degrees(-9))
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                    .offset(x: 14, y: 30)
                    .clipped()
            }

            VStack(alignment: .leading, spacing: 0) {
                Spacer()
                Text(title)
                    .font(.system(size: 23, weight: .heavy))
                    .foregroundStyle(.white)
                    .lineLimit(2)
            }
            .padding(18)
        }
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .shadow(color: PazColors.pazPrimary.opacity(0.6), radius: 15, x: 0, y: 16)
    }
}
```

- [ ] **Step 4: Build to verify**

```bash
cd ios && xcodebuild -scheme PazChurch -destination 'generic/platform=iOS Simulator' build 2>&1 | tail -5
```
Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 5: Commit**

```bash
git add ios/PazChurch/Features/Home/HomeView.swift
git commit -m "feat(ios): events carousel — image support, peek, 3s auto-scroll"
```

---

## Task 4: Profile Edit Access from AccountView

**Files:**
- Modify: `ios/PazChurch/Features/Account/AccountView.swift`

- [ ] **Step 1: Wrap user card in NavigationLink**

In `AccountView.swift`, replace the `userCard(user:)` call site inside `contentState`:

```swift
// BEFORE
if let user = viewModel.user {
    userCard(user: user).padding(.horizontal, 20).padding(.bottom, 24)
```

```swift
// AFTER
if let user = viewModel.user {
    NavigationLink(destination: EditProfileView()) {
        userCard(user: user)
    }
    .buttonStyle(.plain)
    .padding(.horizontal, 20)
    .padding(.bottom, 24)
```

- [ ] **Step 2: Add pencil affordance to userCard**

In the `userCard(user:)` function, wrap the existing `HStack` in a `ZStack` to overlay the pencil icon:

```swift
private func userCard(user: Shared.User) -> some View {
    ZStack(alignment: .topTrailing) {
        HStack(spacing: 12) {
            ZStack {
                Circle().fill(PazColors.pazPrimary.opacity(0.15)).frame(width: 56, height: 56)
                Text(user.name.prefix(1).uppercased()).font(PazTypography.headlineSmall).foregroundStyle(PazColors.pazPrimary)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(user.name).font(PazTypography.titleMedium).foregroundStyle(PazColors.pazPrimary)
                Text(user.email).font(PazTypography.bodySmall).foregroundStyle(PazColors.pazSky).lineLimit(1)
                Spacer().frame(height: 2)
                Text(user.role.displayName)
                    .font(PazTypography.labelSmall)
                    .foregroundStyle(PazColors.pazPrimary)
                    .padding(.horizontal, 8).padding(.vertical, 2)
                    .background(PazColors.pazPrimary.opacity(0.12))
                    .clipShape(Capsule())
            }
            Spacer()
        }
        .padding(16)
        .background(PazColors.tint)
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(PazColors.pazPrimary.opacity(0.13), lineWidth: 1))

        Image(systemName: "pencil")
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(PazColors.pazPrimary)
            .padding(8)
            .background(PazColors.surface)
            .clipShape(Circle())
            .shadow(color: .black.opacity(0.08), radius: 4, y: 2)
            .padding(10)
    }
}
```

- [ ] **Step 3: Build to verify**

```bash
cd ios && xcodebuild -scheme PazChurch -destination 'generic/platform=iOS Simulator' build 2>&1 | tail -5
```
Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 4: Commit**

```bash
git add ios/PazChurch/Features/Account/AccountView.swift
git commit -m "feat(ios): user card in AccountView navigates to EditProfileView"
```

---

## Task 5: Agenda Item Tap → Detail Navigation

**Files:**
- Modify: `ios/PazChurch/Features/Home/HomeView.swift`

- [ ] **Step 1: Add navigationDestination to HomeView's NavigationStack**

In `HomeView.body`, add `.navigationDestination` on the `ScrollView` (inside the existing `NavigationStack`):

```swift
ScrollView {
    // ... existing content
}
.background(PazColors.background)
.navigationTitle("Início")
.navigationBarTitleDisplayMode(.large)
.navigationDestination(for: AgendaEvent.self) { event in
    AgendaDetailView(event: event)
}
```

- [ ] **Step 2: Remove onTap from EventCardView and make it a NavigationLink**

Replace the `EventCardView` struct. Remove the `onTap` parameter and wrap the button content as a `NavigationLink(value:)`:

```swift
private struct EventCardView: View {
    let event: AgendaEvent

    private var time: String {
        guard let part = event.startDate.split(separator: "T").last else { return "--:--" }
        return String(part.prefix(5))
    }

    var body: some View {
        NavigationLink(value: event) {
            HStack(spacing: 13) {
                Text(time)
                    .font(.system(size: 15.5, weight: .bold))
                    .foregroundStyle(PazColors.pazPrimaryLight)
                    .frame(width: 50, alignment: .leading)

                ZStack {
                    Circle().fill(PazColors.tint).frame(width: 18, height: 18)
                    Circle().fill(PazColors.pazPrimary).frame(width: 10, height: 10)
                }

                VStack(alignment: .leading, spacing: 3) {
                    Text(event.title)
                        .font(.system(size: 15.5, weight: .bold))
                        .foregroundStyle(PazColors.ink)
                        .lineLimit(1)

                    if let loc = event.location, !loc.isEmpty {
                        HStack(spacing: 5) {
                            Image(systemName: "mappin.fill")
                                .font(.system(size: 10))
                                .foregroundStyle(PazColors.pazCoral)
                            Text(loc)
                                .font(PazTypography.bodySmall)
                                .foregroundStyle(PazColors.slate)
                        }
                    }
                }

                Spacer()
            }
            .padding(15)
            .background(
                RoundedRectangle(cornerRadius: 18)
                    .fill(PazColors.surface)
                    .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(PazColors.line))
                    .shadow(color: .black.opacity(0.08), radius: 9, x: 0, y: 4)
            )
        }
        .buttonStyle(.plain)
    }
}
```

- [ ] **Step 3: Update all EventCardView call sites** (remove `onTap:` argument)

In `agendaSection` and the calendar event list (Task 7 adds another), replace:
```swift
EventCardView(event: event, onTap: {})
```
with:
```swift
EventCardView(event: event)
```

- [ ] **Step 4: Build to verify**

```bash
cd ios && xcodebuild -scheme PazChurch -destination 'generic/platform=iOS Simulator' build 2>&1 | tail -5
```
Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 5: Commit**

```bash
git add ios/PazChurch/Features/Home/HomeView.swift
git commit -m "feat(ios): agenda items navigate to AgendaDetailView on tap"
```

---

## Task 6: Agenda Shadow Spacing + Section Order

**Files:**
- Modify: `ios/PazChurch/Features/Home/HomeView.swift`
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/HomeContent.kt`
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/HomeRepositoryImpl.kt`

- [ ] **Step 1: Add bottom padding between day strip and event cards in HomeView**

In `HomeView.agendaSection`, find the `.padding(.bottom, 6)` after the day strip `ScrollView` and change it to `.padding(.bottom, 16)`. Also add `padding(.top, 8)` to the event cards `VStack`:

```swift
// The day strip ScrollView ends with:
.padding(.bottom, 16)   // was 6

VStack(spacing: 12) {
    ForEach(agendaEvents, id: \.id) { event in
        EventCardView(event: event)
    }
}
.padding(.horizontal, 16)
.padding(.top, 8)
```

- [ ] **Step 2: Update HomeContent.kt default sectionOrder**

In `shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/HomeContent.kt`, change:

```kotlin
// BEFORE
val sectionOrder: List<String> = listOf("announcements", "contribution", "agenda"),

// AFTER
val sectionOrder: List<String> = listOf("agenda", "announcements", "contribution"),
```

- [ ] **Step 3: Update HomeRepositoryImpl.kt mock sectionOrder**

In `HomeRepositoryImpl.kt`, the `mockHomeContent()` function doesn't explicitly set `sectionOrder`, so it inherits the new default from Step 2. No change needed here unless sectionOrder is explicitly set — verify by searching for `sectionOrder` in `HomeRepositoryImpl.kt`. If found, update it to match Step 2.

- [ ] **Step 4: Build to verify (both iOS and shared)**

```bash
# Shared KMP
./gradlew :shared:compileKotlinIosArm64 2>&1 | tail -5

# iOS
cd ios && xcodebuild -scheme PazChurch -destination 'generic/platform=iOS Simulator' build 2>&1 | tail -5
```
Expected: both `BUILD SUCCEEDED`

- [ ] **Step 5: Commit**

```bash
git add ios/PazChurch/Features/Home/HomeView.swift \
        shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/HomeContent.kt
git commit -m "fix: agenda shadow spacing + section order (agenda first)"
```

---

## Task 7: Calendar Redesign — Sticky Week Strip + Real Data

**Files:**
- Modify: `ios/PazChurch/Features/Home/HomeView.swift`

- [ ] **Step 1: Add week computation helpers to HomeView**

Add these private helpers inside `HomeView` (below the existing `bank` computed property):

```swift
private struct WeekDay {
    let date: Date
    let dow: String
    let day: Int
    let isToday: Bool
    var hasEvent: Bool = false
}

private var weekDays: [WeekDay] {
    let cal = Calendar.current
    let today = Date()
    guard let weekInterval = cal.dateInterval(of: .weekOfYear, for: today) else { return [] }
    let dowLabels = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"]
    return (0..<7).compactMap { offset -> WeekDay? in
        guard let date = cal.date(byAdding: .day, value: offset, to: weekInterval.start) else { return nil }
        let comps = cal.dateComponents([.weekday, .day], from: date)
        let isToday = cal.isDateInToday(date)
        let hasEvent = (viewModel.homeContent?.agenda ?? []).contains { event in
            guard let eventDate = ISO8601DateFormatter().date(from: event.startDate) ??
                  parseDate(event.startDate) else { return false }
            return cal.isDate(eventDate, inSameDayAs: date)
        }
        return WeekDay(
            date: date,
            dow: dowLabels[(comps.weekday ?? 1) - 1],
            day: comps.day ?? 0,
            isToday: isToday,
            hasEvent: hasEvent
        )
    }
}

private func parseDate(_ str: String) -> Date? {
    let fmt = DateFormatter()
    fmt.locale = Locale(identifier: "en_US_POSIX")
    for format in ["yyyy-MM-dd'T'HH:mm:ss.SSSZ", "yyyy-MM-dd'T'HH:mm", "yyyy-MM-dd"] {
        fmt.dateFormat = format
        if let d = fmt.date(from: str) { return d }
    }
    return nil
}

private var selectedDayEvents: [AgendaEvent] {
    guard weekDays.indices.contains(selectedDayIndex) else { return [] }
    let selectedDate = weekDays[selectedDayIndex].date
    let cal = Calendar.current
    return (viewModel.homeContent?.agenda ?? []).filter { event in
        guard let eventDate = ISO8601DateFormatter().date(from: event.startDate) ??
              parseDate(event.startDate) else { return false }
        return cal.isDate(eventDate, inSameDayAs: selectedDate)
    }
}
```

- [ ] **Step 2: Set default selectedDayIndex to today on load**

In `HomeView.body`, change `.task { await viewModel.load() }` to also set the default day:

```swift
.task {
    await viewModel.load()
    // Select today's index in the week strip
    let cal = Calendar.current
    if let todayIndex = weekDays.firstIndex(where: { cal.isDateInToday($0.date) }) {
        selectedDayIndex = todayIndex
    }
}
```

- [ ] **Step 3: Replace agendaSection with sticky-strip version**

Replace the entire `agendaSection` computed property:

```swift
private var agendaSection: some View {
    VStack(spacing: 0) {
        // Header row
        HStack {
            Text("Agenda")
                .font(.system(size: 23, weight: .heavy))
                .foregroundStyle(PazColors.ink)
            Spacer()
            Button(action: { showAgendaList = true }) {
                HStack(spacing: 5) {
                    Text("Mês completo").font(PazTypography.labelSmall)
                    Image(systemName: "arrow.right").font(.system(size: 12, weight: .semibold))
                }
                .foregroundStyle(PazColors.pazPrimaryLight)
            }
        }
        .padding(.horizontal, 18)
        .padding(.bottom, 13)

        // Sticky week strip — outside scroll, full width
        HStack(spacing: 6) {
            ForEach(Array(weekDays.enumerated()), id: \.offset) { index, item in
                DayPillView(
                    dow: item.dow,
                    day: item.day,
                    isSelected: index == selectedDayIndex,
                    isToday: item.isToday,
                    hasEvent: item.hasEvent
                )
                .frame(maxWidth: .infinity)
                .onTapGesture {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        selectedDayIndex = index
                    }
                }
            }
        }
        .padding(.horizontal, 18)
        .padding(.bottom, 16)

        // Event list filtered to selected day
        if selectedDayEvents.isEmpty {
            Text("Nenhum evento")
                .font(PazTypography.bodySmall)
                .foregroundStyle(PazColors.slate)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 20)
                .padding(.top, 8)
        } else {
            VStack(spacing: 12) {
                ForEach(selectedDayEvents, id: \.id) { event in
                    EventCardView(event: event)
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
        }
    }
}
```

- [ ] **Step 4: Update DayPillView to support isToday and hasEvent**

Replace `DayPillView`:

```swift
private struct DayPillView: View {
    let dow: String
    let day: Int
    let isSelected: Bool
    let isToday: Bool
    let hasEvent: Bool

    private var dotColor: Color {
        if isToday { return PazColors.pazGold }
        if hasEvent { return PazColors.pazPrimary }
        return .clear
    }

    var body: some View {
        VStack(spacing: 3) {
            Text(dow)
                .font(PazTypography.labelSmall)
                .foregroundStyle(isSelected ? .white.opacity(0.72) : PazColors.slateLight)
            Text("\(day)")
                .font(.system(size: 21, weight: .bold))
                .foregroundStyle(isSelected ? .white : PazColors.ink)
            Circle()
                .fill(dotColor)
                .frame(width: 4, height: 4)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 74)
        .background(
            Group {
                if isSelected {
                    RoundedRectangle(cornerRadius: 18)
                        .fill(PazColors.dayPillSelectedGradient)
                        .shadow(color: PazColors.pazPrimary.opacity(0.6), radius: 11, x: 0, y: 12)
                } else if isToday {
                    RoundedRectangle(cornerRadius: 18)
                        .fill(PazColors.surface)
                        .overlay(
                            RoundedRectangle(cornerRadius: 18)
                                .strokeBorder(PazColors.pazPrimary.opacity(0.5), lineWidth: 1.5)
                        )
                        .shadow(color: .black.opacity(0.05), radius: 3, x: 0, y: 2)
                } else {
                    RoundedRectangle(cornerRadius: 18)
                        .fill(PazColors.surface)
                        .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(PazColors.line))
                        .shadow(color: .black.opacity(0.05), radius: 3, x: 0, y: 2)
                }
            }
        )
    }
}
```

- [ ] **Step 5: Delete the hardcoded agendaDayItems mock**

Remove the entire bottom section of `HomeView.swift`:
```swift
// REMOVE THIS ENTIRE BLOCK:
private struct AgendaDayItem { let dow: String; let day: Int }
private let agendaDayItems: [AgendaDayItem] = [
    .init(dow: "SEG", day: 2), .init(dow: "TER", day: 3), .init(dow: "QUA", day: 4),
    .init(dow: "QUI", day: 5), .init(dow: "SEX", day: 6), .init(dow: "SÁB", day: 7),
    .init(dow: "DOM", day: 8),
]
```

- [ ] **Step 6: Build to verify**

```bash
cd ios && xcodebuild -scheme PazChurch -destination 'generic/platform=iOS Simulator' build 2>&1 | tail -5
```
Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 7: Commit**

```bash
git add ios/PazChurch/Features/Home/HomeView.swift
git commit -m "feat(ios): calendar redesign — sticky week strip, real dates, event dots"
```

---

## Task 8: Native Navigation Bars (5 views)

**Files:**
- Modify: `ios/PazChurch/Features/MemberJourney/MemberJourneyView.swift`
- Modify: `ios/PazChurch/Features/MeetingReport/MeetingReportView.swift`
- Modify: `ios/PazChurch/Features/Formularios/FormulariosView.swift`
- Modify: `ios/PazChurch/Features/Agenda/AgendaListView.swift`
- Modify: `ios/PazChurch/Features/Profile/ProfileView.swift`

Apply the same transformation to all 5 views:
1. Remove the custom `headerBar` / hero `VStack` block
2. Remove `.navigationBarHidden(true)` and `.navigationBarBackButtonHidden()`
3. Remove any `@Environment(\.dismiss)` back button wiring from the hero header (keep `dismiss` if used elsewhere)
4. Add `.navigationTitle("…")` + `.navigationBarTitleDisplayMode(.large)` on the `ScrollView`
5. The `NavigationStack` wrapper is already present — keep it

- [ ] **Step 1: Update MemberJourneyView**

```swift
// REMOVE the heroHeader VStack and its ZStack wrapper, plus:
// .navigationBarBackButtonHidden()

// The body becomes:
var body: some View {
    NavigationStack {
        Group {
            if viewModel.isLoading {
                loadingState
            } else {
                contentState
            }
        }
        .navigationTitle("Minha Jornada")
        .navigationBarTitleDisplayMode(.large)
        .background(PazColors.background)
    }
    .task { viewModel.loadJourney() }  // or however it's currently called
}

// contentState becomes a plain ScrollView (remove .background wrapper duplication):
private var contentState: some View {
    ScrollView {
        VStack(alignment: .leading, spacing: PazSpacing.lg) {
            Spacer().frame(height: PazSpacing.lg)
            ForEach(viewModel.steps, id: \.id) { step in
                JourneyStepRow(step: step)
            }
            Spacer().frame(height: PazSpacing.xl)
        }
        .padding(.horizontal, PazSpacing.lg)
    }
}
```

- [ ] **Step 2: Update MeetingReportView**

```swift
// REMOVE the hero VStack header and its ZStack wrapper
// REMOVE .navigationBarBackButtonHidden()

var body: some View {
    NavigationStack {
        ScrollView {
            VStack(alignment: .leading, spacing: PazSpacing.lg) {
                Spacer().frame(height: PazSpacing.lg)
                FormField(label: "Data da Reunião", placeholder: "DD/MM/YYYY", text: $viewModel.date)
                FormField(label: "Participantes", placeholder: "0", text: $viewModel.attendees)
                FormField(label: "Visitantes", placeholder: "0", text: $viewModel.visitors)
                FormField(label: "Ofertas (R$)", placeholder: "0,00", text: $viewModel.offerings)
                FormField(
                    label: "Observações",
                    placeholder: "Algo importante?",
                    text: $viewModel.observations,
                    multiline: true
                )
                if let error = viewModel.error {
                    Text(error)
                        .font(PazTypography.bodySmall)
                        .foregroundColor(.red)
                        .padding(PazSpacing.lg)
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(12)
                }
                Button(action: { viewModel.onSubmit() }) {
                    Text(viewModel.isSubmitting ? "Enviando..." : "Enviar Relatório")
                        .font(PazTypography.titleMedium)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, PazSpacing.md)
                        .background(viewModel.isSubmitting ? Color.gray : PazColors.primary)
                        .cornerRadius(12)
                }
                .disabled(viewModel.isSubmitting || viewModel.date.isEmpty || viewModel.attendees.isEmpty)
                Spacer().frame(height: PazSpacing.xl)
            }
            .padding(.horizontal, PazSpacing.lg)
        }
        .background(PazColors.background)
        .navigationTitle("Relatar Reunião")
        .navigationBarTitleDisplayMode(.large)
    }
}
```

- [ ] **Step 3: Update FormulariosView**

```swift
// REMOVE headerBar, the ZStack(alignment: .top) wrapper, and navigationBarHidden

var body: some View {
    NavigationStack {
        Group {
            if viewModel.isLoading { loadingState }
            else if viewModel.forms.isEmpty { emptyState }
            else { contentState }
        }
        .background(PazColors.background)
        .navigationTitle("Formulários")
        .navigationBarTitleDisplayMode(.large)
    }
    .task { await viewModel.load() }
}

// contentState — remove extra .background wrapper, just:
private var contentState: some View {
    ScrollView {
        VStack(spacing: 10) {
            Spacer().frame(height: 8)
            ForEach(viewModel.forms, id: \.id) { form in
                NavigationLink(destination: FormDetailView(form: form)) {
                    FormCard(form: form)
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 20)
            }
            Spacer().frame(height: 32)
        }
        .padding(.top, 8)
    }
}
```

- [ ] **Step 4: Update AgendaListView**

```swift
// REMOVE headerBar VStack and navigationBarHidden

var body: some View {
    NavigationStack {
        Group {
            if events.isEmpty { emptyState }
            else { eventList }
        }
        .background(PazColors.background)
        .navigationTitle("Agenda")
        .navigationBarTitleDisplayMode(.large)
    }
}

// eventList — remove the "PRÓXIMOS EVENTOS" label padding top duplicate, just:
private var eventList: some View {
    ScrollView {
        VStack(alignment: .leading, spacing: 12) {
            Text("PRÓXIMOS EVENTOS")
                .font(PazTypography.labelSmall)
                .foregroundStyle(PazColors.slateLight)
                .padding(.horizontal, 20)
                .padding(.top, 16)
            ForEach(events, id: \.id) { event in
                NavigationLink(destination: AgendaDetailView(event: event)) {
                    AgendaEventRow(event: event).padding(.horizontal, 20)
                }
                .buttonStyle(.plain)
            }
            Spacer().frame(height: 32)
        }
    }
}
```

- [ ] **Step 5: Update ProfileView**

```swift
// REMOVE heroHeader VStack and navigationBarHidden
// Keep NavigationStack

var body: some View {
    NavigationStack {
        Group {
            if viewModel.isLoading { loadingState }
            else if viewModel.user == nil { loggedOutState }
            else { loggedInState }
        }
        .background(PazColors.background)
        .navigationTitle("Meu Perfil")
        .navigationBarTitleDisplayMode(.large)
    }
    .task { await viewModel.loadUser() }
}
```

- [ ] **Step 6: Build to verify**

```bash
cd ios && xcodebuild -scheme PazChurch -destination 'generic/platform=iOS Simulator' build 2>&1 | tail -5
```
Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 7: Commit**

```bash
git add ios/PazChurch/Features/MemberJourney/MemberJourneyView.swift \
        ios/PazChurch/Features/MeetingReport/MeetingReportView.swift \
        ios/PazChurch/Features/Formularios/FormulariosView.swift \
        ios/PazChurch/Features/Agenda/AgendaListView.swift \
        ios/PazChurch/Features/Profile/ProfileView.swift
git commit -m "feat(ios): native transparent nav bars — replace all custom hero headers"
```

---

## Task 9: Backend Section Order (KMP Shared)

**Files:**
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/HomeContent.kt`
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/HomeRepositoryImpl.kt`

- [ ] **Step 1: Update HomeContent.kt default**

```kotlin
// BEFORE
val sectionOrder: List<String> = listOf("announcements", "contribution", "agenda"),

// AFTER
val sectionOrder: List<String> = listOf("agenda", "announcements", "contribution"),
```

- [ ] **Step 2: Update mock in HomeRepositoryImpl.kt**

In `mockHomeContent()`, add explicit `sectionOrder` to the returned `HomeContent`:

```kotlin
private fun mockHomeContent() = HomeContent(
    banners = listOf(
        Banner(id = "1", title = "Culto da Família",  imageUrl = "Auditório Principal", actionUrl = "DOMINGO · 10H"),
        Banner(id = "2", title = "Escola de Líderes", imageUrl = "Inscrições abertas",  actionUrl = "ACADEMIA"),
        Banner(id = "3", title = "Culto de Oração",   imageUrl = "Templo Sede",         actionUrl = "QUARTA · 20H"),
    ),
    contribution = ContributionSection(
        bank = BankInfo(name = "Paz Church", pixKey = "pix@pazchurch.com.br"),
    ),
    agenda = listOf(
        AgendaEvent(id = "1", title = "Culto da Família", startDate = "2026-06-08T10:00", location = "Auditório Principal"),
        AgendaEvent(id = "2", title = "Grupo de Vida",    startDate = "2026-06-04T19:30", location = "Sala 3 — Bloco B"),
        AgendaEvent(id = "3", title = "Ensaio do Louvor", startDate = "2026-06-04T20:00", location = "Sala de Música"),
    ),
    sectionOrder = listOf("agenda", "announcements", "contribution"),
)
```

- [ ] **Step 3: Run shared tests**

```bash
./gradlew :shared:allTests 2>&1 | tail -10
```
Expected: `BUILD SUCCESSFUL` (or all tests pass)

- [ ] **Step 4: Commit**

```bash
git add shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/HomeContent.kt \
        shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/HomeRepositoryImpl.kt
git commit -m "fix(shared): section order — agenda first, then announcements, then contribution"
```
