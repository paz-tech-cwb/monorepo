import SwiftUI
import Shared

@main
struct PazChurchApp: App {
    @StateObject private var authManager = AuthManager()

    var body: some Scene {
        WindowGroup {
            if authManager.isAuthenticated {
                MainTabView()
            } else {
                LoginView()
            }
        }
    }
}

class AuthManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?

    init() {
        loadAuthState()
    }

    private func loadAuthState() {
        // Check if user is already authenticated
        isAuthenticated = false // TODO: check token from storage
    }
}
