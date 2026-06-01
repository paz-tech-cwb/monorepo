import SwiftUI
import Shared
import FirebaseCore

@main
struct PazChurchApp: App {
    @StateObject private var authCoordinator: AuthenticationCoordinator

    init() {
        // Initialize Firebase
        FirebaseApp.configure()

        // Initialize auth coordinator
        _authCoordinator = StateObject(wrappedValue: AuthenticationCoordinator(
            authRepository: AuthRepositoryImpl()
        ))
    }

    var body: some Scene {
        WindowGroup {
            if authCoordinator.isLoading {
                SplashView()
            } else if authCoordinator.isAuthenticated {
                MainTabView()
                    .environmentObject(authCoordinator)
            } else {
                LoginView(authCoordinator: authCoordinator)
            }
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
