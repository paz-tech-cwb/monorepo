import SwiftUI
import Shared
import FirebaseCore

@main
struct PazChurchApp: App {
    // Bridge to UIApplicationDelegate for APNs token callbacks
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    @State private var authCoordinator: AuthenticationCoordinator
    @State private var pushService = PushNotificationService.shared

    init() {
        FirebaseApp.configure()
        _authCoordinator = State(initialValue: AuthenticationCoordinator(
            authRepository: IosAppContainer.shared.authRepository
        ))
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if authCoordinator.isLoading {
                    SplashView()
                } else {
                    MainTabView()
                        .environment(authCoordinator)
                        .onAppear {
                            pushService.requestPermissionAndRegister()
                        }
                }
            }
            // When the user taps a notification and the app is already running,
            // pendingDeepLink is set; views can observe this to navigate.
            .environment(pushService)
        }
    }
}

struct SplashView: View {
    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.25, green: 0.12, blue: 0.62),
                    Color(red: 0.31, green: 0.16, blue: 0.78),
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            VStack(spacing: 24) {
                Spacer()
                Text("Paz Church")
                    .font(.system(size: 32, weight: .semibold))
                    .foregroundColor(.white)
                Spacer()
                ProgressView()
                    .tint(.white)
                Spacer().frame(height: 60)
            }
        }
        .ignoresSafeArea()
    }
}
