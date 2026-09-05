# Home & Account UI Improvements — Design Spec
**Date:** 2026-06-05  
**Status:** Approved

---

## Overview

A set of focused UI/UX improvements across the KMP iOS app covering navigation bars, the home screen (events carousel, agenda calendar, agenda item navigation), image caching, profile edit access, and backend section ordering.

---

## 1. Navigation Bars

### Problem
`MemberJourneyView`, `MeetingReportView`, `FormulariosView`, `AgendaListView`, and `ProfileView` use custom colored `VStack` hero headers with `.navigationBarHidden(true)`. They don't blur, don't collapse the title on scroll, and conflict with iOS 26 Liquid Glass.

### Solution
Remove all custom hero headers from these 5 views. Replace with:
- `NavigationStack` wrapping the scroll content
- `.navigationTitle("…")` + `.navigationBarTitleDisplayMode(.large)` on the `ScrollView`
- Remove `.navigationBarHidden(true)` and `.navigationBarBackButtonHidden()`
- The system provides the transparent nav bar that blurs automatically as content scrolls behind it — no extra modifier needed

**Exception:** `AgendaDetailView` keeps its floating back button — it's a full-bleed hero image detail screen where a native nav bar would look wrong.

**Views to update:**
| View | New title |
|------|-----------|
| `MemberJourneyView` | "Minha Jornada" |
| `MeetingReportView` | "Relatar Reunião" |
| `FormulariosView` | "Formulários" |
| `AgendaListView` | "Agenda" |
| `ProfileView` | "Meu Perfil" |

---

## 2. Events Carousel (Banners)

### Problem
`FeaturedCardView` ignores `banner.imageUrl` — always shows a gradient. No auto-scroll, no peek of next card, no full-width when there's only one banner.

### Solution

**Images:**
- When `banner.imageUrl` is non-empty, show with `KFImage` (Kingfisher), `.scaledToFill()`, clipped to the card shape
- Overlay a `LinearGradient` from `.clear` (top) to `.black.opacity(0.6)` (bottom) so the title stays readable
- Fall back to the current gradient when `imageUrl` is empty

**Peek (2+ banners):**
- Cards use `.padding(.trailing, 44)` so ~10% of the next card peeks out
- `TabView` frame height stays at 240

**Single banner:**
- No trailing padding — card takes full available width

**Auto-scroll:**
- `Timer.scheduledTimer` fires every 3 seconds
- Advances `currentFeatureIndex` with `withAnimation(.easeInOut)`
- Timer resets when the user manually swipes (use `.onChange(of: currentFeatureIndex)` to detect manual changes via a drag flag)

---

## 3. Image Caching (Kingfisher)

### Problem
All `AsyncImage` usages have no disk cache on iOS. Images re-download on every view appearance.

### Solution
Replace every `AsyncImage` with `KFImage`. Kingfisher disk-caches by default.

**Standard pattern:**
```swift
KFImage(url)
    .resizable()
    .placeholder { PazColors.surface }
    .fade(duration: 0.2)
    .scaledToFill()
```

**Files to update:**
- `AgendaDetailView` — hero image
- `AgendaListView` (`AgendaEventRow`) — date box thumbnail
- `FeaturedCardView` — banner image (new, from §2)

---

## 4. Agenda Item Tap → Detail Navigation

### Problem
`EventCardView` in `HomeView` has `onTap: {}` — empty closure. Tapping does nothing.

### Solution
- Replace `onTap` closure with `NavigationLink(value: event)` wrapping the card content
- Add `.navigationDestination(for: AgendaEvent.self)` on the `NavigationStack` in `HomeView` → `AgendaDetailView(event:)`
- Remove the `onTap` parameter from `EventCardView` entirely

---

## 5. Profile Edit Access

### Problem
`AccountView` shows the user card inline but provides no route to `EditProfileView`. The user cannot reach their profile editor.

### Solution
- Wrap the user card in `AccountView` in a `NavigationLink(destination: EditProfileView())`
- Add a small pencil icon (`Image(systemName: "pencil")`) in the top-right corner of the card as a visual affordance
- No separate "Edit Profile" button row needed

---

## 6. Agenda Shadow Spacing + Section Order

### Shadow spacing
Add `padding(.bottom, 16)` between the day strip `ScrollView` and the event cards `VStack` in `HomeView.agendaSection`. Prevents card shadows from clipping against the strip.

### Backend section order
Change the default `sectionOrder` in two places:

**`HomeContent.kt`:**
```kotlin
val sectionOrder: List<String> = listOf("agenda", "announcements", "contribution")
```

**`HomeRepositoryImpl.kt` mock:**
Update the mock `HomeContent` to use the same order.

---

## 7. Calendar Redesign (Option A — Sticky Strip + Flat List)

### Problem
The day strip is inside the `ScrollView` (scrolls away), uses hardcoded mock data, has no today highlight, and no event-dot indicators.

### Solution

**Week strip — outside the `ScrollView`:**
- Rendered above the `ScrollView` in a `VStack`, so it stays fixed as content scrolls
- 7 pills always representing Mon–Sun of the current week, computed from `Calendar.current` + `Date()`
- No horizontal scroll — 7 pills fit the full width using `HStack` with equal `frame(maxWidth: .infinity)`

**Day pill states:**
| State | Appearance |
|-------|-----------|
| Today, selected | Filled blue gradient pill + gold dot |
| Today, not selected | Outlined pill + gold dot (ring highlight) |
| Has event, selected | Filled blue gradient pill + blue dot |
| Has event, not selected | Outlined pill + blue dot |
| Normal, selected | Filled blue gradient pill, no dot |
| Normal, not selected | Outlined pill, no dot |

**Event list:**
- Filtered to events matching `selectedDay` (compare date components: year, month, day)
- If no events: `Text("Nenhum evento")` in slate color — no large empty space
- Each `EventCardView` is a `NavigationLink(value: event)` (from §4)
- Default selected day on load = today

**Data source:**
- Day pills computed from `Calendar.current.dateInterval(of: .weekOfYear, for: Date())` — real dates, no hardcoded array
- Event dots derived by checking which days in `viewModel.homeContent?.agenda` fall within the displayed week

**`agendaDayItems` mock array:** Deleted — replaced by computed week data.

---

## Files Changed

### iOS
| File | Change |
|------|--------|
| `HomeView.swift` | Calendar redesign, banner auto-scroll + peek + Kingfisher, agenda tap navigation, shadow spacing |
| `AgendaDetailView.swift` | Kingfisher hero image |
| `AgendaListView.swift` | Native nav bar, Kingfisher thumbnails |
| `MemberJourneyView.swift` | Native nav bar |
| `MeetingReportView.swift` | Native nav bar |
| `FormulariosView.swift` | Native nav bar |
| `ProfileView.swift` | Native nav bar |
| `AccountView.swift` | User card → NavigationLink to EditProfileView |

### KMP Shared
| File | Change |
|------|--------|
| `HomeContent.kt` | Default sectionOrder: agenda first |
| `HomeRepositoryImpl.kt` | Mock sectionOrder: agenda first |
