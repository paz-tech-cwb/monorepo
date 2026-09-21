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

        // Must run before IosAppContainer.shared.authRepository is first touched below,
        // since baseUrl is read when the lazy httpClient is created.
        // Debug keeps IosAppContainer's default (http://localhost:3001/api — the
        // Simulator shares the host Mac's network stack, so this needs no per-network IP).
        #if !DEBUG
        IosAppContainer.shared.baseUrl = AppConfig.baseUrl
        #endif

        let service = PushNotificationService.shared
        _pushService = State(initialValue: service)

        FirebaseApp.configure()
        Messaging.messaging().delegate = service

        _authCoordinator = State(initialValue: AuthenticationCoordinator(
            authRepository: IosAppContainer.shared.authRepository
        ))

        // Prefetch the onboarding welcome video as soon as the app process starts — well
        // before any sign-in — so it plays instantly once a member reaches that step instead
        // of stalling on a live stream. Best-effort: VideoCache swallows failures internally,
        // and WelcomeVideoStepView falls back to streaming the remote URL directly if this
        // hasn't finished (or failed) by the time onboarding is shown.
        Task.detached(priority: .background) {
            try? await VideoCache.shared.prefetch(url: AppConfig.onboardingVideoURL.absoluteString)
        }
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
                        // Onboarding resumes on relaunch/session-restore, not only on an
                        // explicit sign-in. Presented from the root (not LoginView) because
                        // a restored session never shows LoginView.
                        .fullScreenCover(isPresented: $authCoordinator.showOnboardingOnRestore) {
                            OnboardingView(
                                repository: IosAppContainer.shared.onboardingRepository,
                                onFinished: { authCoordinator.showOnboardingOnRestore = false }
                            )
                        }
                }
            }
            .pazMeshBackground()
            .preferredColorScheme(themeManager.isDarkMode ? .dark : .light)
            // When the user taps a notification and the app is already running,
            // pendingDeepLink is set; views can observe this to navigate.
            .environment(pushService)
            .onChange(of: scenePhase) { _, phase in
                guard phase == .active else { return }
                Task {
                    let settings = await UNUserNotificationCenter.current().notificationSettings()
                    let status = switch settings.authorizationStatus {
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
