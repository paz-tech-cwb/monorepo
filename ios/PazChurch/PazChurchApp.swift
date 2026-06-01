import SwiftUI
import Shared
import FirebaseCore

@main
struct PazChurchApp: App {
    // Bridge to UIApplicationDelegate for APNs token callbacks
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    @StateObject private var authCoordinator: AuthenticationCoordinator
    @StateObject private var pushService = PushNotificationService.shared

    init() {
        FirebaseApp.configure()
        _authCoordinator = StateObject(wrappedValue: AuthenticationCoordinator(
            authRepository: AuthRepositoryImpl()
        ))
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if authCoordinator.isLoading {
                    SplashView()
                } else if authCoordinator.isAuthenticated {
                    MainTabView()
                        .environmentObject(authCoordinator)
                        .onAppear {
                            // Request push permission once the user is authenticated
                            pushService.requestPermissionAndRegister()
                        }
                } else {
                    LoginView(authCoordinator: authCoordinator)
                }
            }
            // When the user taps a notification and the app is already running,
            // pendingDeepLink is set; views can observe this to navigate.
            .environmentObject(pushService)
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
