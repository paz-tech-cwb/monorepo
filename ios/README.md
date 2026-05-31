# iOS SwiftUI - Paz Church

SwiftUI app consuming the KMP shared layer (`Shared` framework) for iOS Phase 4 implementation.

## Structure

```
ios/PazChurch/
├── PazChurchApp.swift           # App entry point
├── Theme/
│   ├── PazColors.swift          # Color palette & gradients
│   ├── PazTypography.swift      # Typography styles
│   └── PazSpacing.swift         # Spacing tokens & shapes
├── Components/
│   └── SkeletonView.swift       # Loading skeleton animation
├── Features/
│   ├── Auth/
│   │   └── LoginView.swift
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
    └── MainTabView.swift        # Bottom tab navigation
```

## Phase 4 Screens Implemented

✅ **Profile** — User info with edit & logout  
✅ **EditProfile** — Name update form  
✅ **AgendaDetail** — Single event details  
✅ **Formulários** — Forms list  
✅ **FormDetail** — Individual form (placeholder)  
✅ **MemberJourney** — Timeline of growth steps  
✅ **MeetingReport** — Leader form (date, attendees, offerings, notes)  
✅ **NotificationPrefs** — Toggle notification categories  

## Architecture

- **MVVM pattern** — ObservableObject ViewModels + @Published state
- **Async/await** — Swift concurrency for async repository calls
- **Shared KMP layer** — Type-safe interop via KMP framework
- **Design system** — Consistent colors, typography, spacing across all views
- **UDF principles** — Immutable state + computed derived state

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

## Notes

- All screens follow the same UDF pattern as Android
- ViewModels async-load data from shared repositories
- Navigation between screens uses NavigationStack (iOS 16+)
- Loading, error, and empty states implemented on all list screens
- Theme tokens ensure consistency across the app

## Next Steps

- Implement Home, Academy, Account tab views
- Wire navigation between detail screens
- Test shared layer interop with real API calls
- Add authentication flow (Google/Apple OAuth)
- Add error handling and retry mechanisms
- Implement proper deep linking
