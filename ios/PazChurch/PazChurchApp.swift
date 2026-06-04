import FirebaseCore
import Shared
import SwiftUI

@main
struct PazChurchApp: App {
    /// Bridge to UIApplicationDelegate for APNs token callbacks
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
