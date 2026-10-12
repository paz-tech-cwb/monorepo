import FirebaseCore
import FirebaseMessaging
import Pulse
import PulseProxy
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
        // Must be first: registers Pulse's network interception so it captures every
        // NSURLSession task, including the one backing the shared Ktor client below.
        // Once that client's httpClient is lazily constructed (the next statement
        // touches it via the keychain/auth wiring), it's too late for Pulse to swap
        // in its interception.
        //
        // NetworkLogger.enableProxy(logger:) (PulseProxy target) is used here instead
        // of Pulse's own URLSessionProxyDelegate.enableAutomaticRegistration — the
        // latter is soft-deprecated since Pulse 5.0 and only works by swizzling
        // URLSession's delegate-based init to wrap whatever delegate is passed in.
        // Ktor's Darwin engine (backing the shared Ktor client) builds and owns its
        // own internal NSURLSessionDataDelegate, and in practice that delegate chain
        // doesn't get reliably wrapped by that init-swizzle: `NetworkLogger
        // .logDataTask(_:didReceive:)` — the call Pulse requires to accumulate
        // response bytes — never fires for Ktor's tasks, so the inspector shows the
        // request/response line (status, timing) but the body is always empty.
        // PulseProxy instead swizzles `URLSessionTask.resume()` and the private
        // underlying `__NSCFURLSessionTask`/`__NSCFURLLocalSessionConnection` classes
        // directly, which captures task data regardless of which delegate object (if
        // any) the session was constructed with, so it reliably captures Ktor/Darwin
        // traffic too.
        // The refresh-token and social-login endpoints' response bodies contain
        // live access/refresh tokens. Exclude them from capture entirely via
        // Pulse's own exclusion mechanism rather than relying on Ktor-level
        // header sanitization (which does not cover response bodies) — see the
        // note in PazHttpClient.kt.
        let pulseLogger = NetworkLogger {
            $0.excludedURLs = ["*auth/refresh*", "*auth/social-login*"]
            // The Authorization header carries the live Bearer access token
            // on every request; redact it so it never appears in the
            // inspector UI.
            $0.sensitiveHeaders = ["Authorization"]
            // Belt-and-braces body-field redaction, in case a token ever shows up
            // in a request/response body on an endpoint that isn't excluded above.
            $0.sensitiveDataFields = ["access_token", "refresh_token"]
        }
        // Pulse defaults to a 14-day retention window; match Android's explicit
        // one-hour RetentionManager.Period.ONE_HOUR (see PazApplication.kt) so
        // captured traffic doesn't linger on-device far beyond the gated
        // inspector flow's intended lifetime.
        LoggerStore.shared.configuration.maxAge = 3600
        NetworkLogger.enableProxy(logger: pulseLogger)

        // Pulse excludes its own log directory from backup internally, but only on the
        // directory's first creation (a library bug: `createDirectoryIfNeeded` returns
        // `true`, not `false`, when it just created the directory, so Pulse's own
        // `isExcludedFromBackup` assignment — gated on that return value being `false` —
        // is skipped on first launch). Set the flag ourselves on every launch so the
        // request/response bodies Pulse persists there are never swept into iCloud/iTunes
        // backup, even on a fresh install. `URL.logs` itself is Pulse-internal (package
        // access), so the same Library/Logs/com.github.kean.logger path is reconstructed
        // here directly. This relies on `LoggerStore.shared` (above) having already
        // been touched so Pulse's log directory exists on disk — the `try?` below
        // silently no-ops if the directory doesn't exist yet, so reordering these two
        // statements would make this exclusion silently ineffective.
        var pulseLogsURL = FileManager.default
            .urls(for: .libraryDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Logs", isDirectory: true)
            .appendingPathComponent("com.github.kean.logger", isDirectory: true)
        var pulseLogsResourceValues = URLResourceValues()
        pulseLogsResourceValues.isExcludedFromBackup = true
        try? pulseLogsURL.setResourceValues(pulseLogsResourceValues)

        // Must run before any repository touches token storage.
        IosKeychainProvider.shared.keychain = KmpKeychainBridge()

        // Must run before IosAppContainer.shared.authRepository is first touched below,
        // since baseUrl is read when the lazy httpClient is created.
        // Debug keeps IosAppContainer's default (http://localhost:3001/api — the
        // Simulator shares the host Mac's network stack, so this needs no per-network IP).
        #if !DEBUG
        IosAppContainer.shared.baseUrl = AppConfig.baseUrl
        #endif

        PazImageCache.configure()

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
