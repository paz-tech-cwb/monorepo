# iOS SwiftUI - Paz Church

SwiftUI app consuming the KMP shared layer (`Shared` framework) for iOS Phase 4 implementation.

## Structure

```
ios/PazChurch/
├── PazChurchApp.swift           # App entry point with auth state
├── Theme/
│   ├── PazColors.swift          # Color palette & gradients
│   ├── PazTypography.swift      # Typography styles
│   └── PazSpacing.swift         # Spacing tokens & shapes
├── Components/
│   └── SkeletonView.swift       # Loading skeleton animation
├── Features/
│   ├── Auth/
│   │   └── LoginView.swift      # Google/Apple OAuth entry
│   ├── Home/
│   │   ├── HomeView.swift       # Hero greeting + banners + agenda
│   │   └── HomeViewModel.swift
│   ├── Academy/
│   │   ├── AcademyView.swift    # Featured video + category filter + list
│   │   └── AcademyViewModel.swift
│   ├── Account/
│   │   ├── AccountView.swift    # Menu navigation + dark mode + logout
│   │   └── AccountViewModel.swift
│   ├── Profile/
│   │   ├── ProfileView.swift
│   │   ├── ProfileViewModel.swift
│   │   ├── EditProfileView.swift
│   │   └── EditProfileViewModel.swift
│   ├── Agenda/
│   │   └── AgendaDetailView.swift
│   ├── Formularios/
│   │   ├── FormulariosView.swift
│   │   └── FormDetailView.swift
│   ├── MemberJourney/
│   │   └── MemberJourneyView.swift
│   ├── MeetingReport/
│   │   └── MeetingReportView.swift
│   └── Notifications/
│       └── NotificationPrefsView.swift
└── Navigation/
    └── MainTabView.swift        # TabView with Home, Academy, Account
```

## Phase 4 Implementation — All 10 Screens

### Tab Screens (Main Navigation)
✅ **Home** — Hero greeting + banners carousel + contribution card + agenda events  
✅ **Academy** — Featured video + category filter + video list  
✅ **Account** — Profile card + menu navigation to detail screens + dark mode + logout  

### Detail Screens (Accessible from Menus/Taps)
✅ **Profile** — User info with edit & logout  
✅ **EditProfile** — Name update form  
✅ **AgendaDetail** — Single event details (date, location, description)  
✅ **Formulários** — Forms catalog list  
✅ **FormDetail** — Individual form placeholder  
✅ **MemberJourney** — Timeline of growth steps with visual status  
✅ **MeetingReport** — Leader form (date, attendees, offerings, notes)  
✅ **NotificationPrefs** — Toggle notification categories  

## Architecture

- **MVVM pattern** — ObservableObject ViewModels + @Published state
- **Async/await** — Swift concurrency for async repository calls
- **Shared KMP layer** — Type-safe interop via KMP framework
- **Design system** — PazColors, PazTypography, PazSpacing (mirrors Android)
- **Navigation** — TabView + NavigationStack (iOS 16+)
- **State management** — ViewModel coordinates data loading + error handling

## Key Features

- **Home**: Banners carousel with auto-slide, contribution card (PIX/Bank buttons), upcoming events
- **Academy**: Featured video, category filter with toggle, video list with thumbnails
- **Account**: User profile card, menu navigation to all features, dark mode toggle, logout
- **Loading States**: Skeleton animations with shimmer effect on all lists
- **Error States**: Retry buttons with custom error messaging
- **Navigation**: Deep linking between tab screens and detail screens

## Setup (Xcode)

1. Open `PazChurch.xcodeproj` in Xcode 15+
2. Ensure `Shared` KMP framework is linked:
   - **Build Phases** → **Link Binary With Libraries** → add `Shared.xcframework`
3. Add fonts to target (Playfair Display + DM Sans):
   - Copy `.ttf` files to Xcode
   - Add to **Info.plist** → **Fonts provided by application**
4. Build target: `Cmd+B`

## Running

```bash
cd ios
xcodebuild -scheme PazChurch -configuration Debug

# Or open in Xcode and hit Run (Cmd+R)
```

## Next Steps

- Wire authentication flow (Google/Apple OAuth via platform SDKs)
- Implement token storage (Keychain integration)
- Add proper error handling and retry mechanisms
- Test API integration with real backend
- Implement deep linking for all screens
- Add haptic feedback and animations
