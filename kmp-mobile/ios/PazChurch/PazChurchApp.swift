import FirebaseCore
import FirebaseMessaging
import Shared
import SwiftUI
import UserNotifications

@main
struct PazChurchApp: App {
    /// Bridge to UIApplicationDelegate for APNs token callbacks
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    @Environment(\.scenePhase) private var scenePhase
    @State private var authCoordinator: AuthenticationCoordinator
    @State private var pushService: PushNotificationService
    @State private var themeManager = AppThemeManager()

    init() {
        // Must run before any repository touches token storage.
        IosKeychainProvider.shared.keychain = KmpKeychainBridge()
        
        let service = PushNotificationService.shared
        _pushService = State(initialValue: service)
        
        FirebaseApp.configure()
        Messaging.messaging().delegate = service
        
        _authCoordinator = State(initialValue: AuthenticationCoordinator(
            authRepository: IosAppContainer.shared.authRepository
        ))
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if authCoordinator.isInitializing {
                    SplashView()
                } else {
                    MainTabView()
                        .environment(authCoordinator)
                        .environment(themeManager)
                        .onAppear {
                            pushService.requestPermissionAndRegister()
                        }
                }
            }
            .preferredColorScheme(themeManager.isDarkMode ? .dark : .light)
            // When the user taps a notification and the app is already running,
            // pendingDeepLink is set; views can observe this to navigate.
            .environment(pushService)
            .onChange(of: scenePhase) { _, phase in
                guard phase == .active else { return }
                Task {
                    let settings = await UNUserNotificationCenter.current().notificationSettings()
                    let status: String = switch settings.authorizationStatus {
                    case .authorized: "granted"
                    case .denied: "denied"
                    default: "not_determined"
                    }
                    try? await IosAppContainer.shared.userRepository.updateNotificationPreferences(
                        dto: UpdateNotificationPrefsDto(
                            eventsEnabled: nil,
                            announcementsEnabled: nil,
                            lifeGroupEnabled: nil,
                            academyEnabled: nil,
                            memberJourneyEnabled: nil,
                            contributionsEnabled: nil,
                            osPermissionStatus: status
                        )
                    )
                }
            }
        }
    }
}

struct SplashView: View {
    var body: some View {
        ZStack {
            PazColors.background
                .ignoresSafeArea()

            Image("PazLogo")
                .resizable()
                .scaledToFit()
                .frame(width: 140)
        }
    }
}

#Preview {
    SplashView()
}
