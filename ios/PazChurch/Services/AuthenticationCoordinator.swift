import SwiftUI
import Combine
import Shared
import FirebaseAuth
import FirebaseCore

@MainActor
class AuthenticationCoordinator: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var isLoading = true
    @Published var error: String?

    private let authRepository: AuthRepository
    private let keychain = KeychainService.shared
    private var cancellables = Set<AnyCancellable>()

    init(authRepository: AuthRepository) {
        self.authRepository = authRepository
        checkAuthState()
    }

    private func checkAuthState() {
        Task {
            do {
                // Try to load stored tokens first
                if let accessToken = try keychain.retrieve(key: "accessToken") {
                    // Validate token is still fresh (or refresh if needed)
                    let user = try await authRepository.currentUser()
                    if user != nil {
                        self.currentUser = user
                        self.isAuthenticated = true
                        self.isLoading = false
                        return
                    }
                }
            } catch {
                // Keychain error, try to refresh
            }

            // No valid token, mark as logged out
            self.isAuthenticated = false
            self.currentUser = nil
            self.isLoading = false
        }
    }

    func signInWithGoogle(idToken: String) async {
        isLoading = true
        error = nil

        do {
            let user = try await authRepository.signInWithGoogle(idToken: idToken)
            self.currentUser = user
            self.isAuthenticated = true
            isLoading = false
        } catch {
            self.error = error.localizedDescription
            isLoading = false
        }
    }

    func signInWithApple(idToken: String, nonce: String) async {
        isLoading = true
        error = nil

        do {
            let user = try await authRepository.signInWithApple(idToken: idToken, nonce: nonce)
            self.currentUser = user
            self.isAuthenticated = true
            isLoading = false
        } catch {
            self.error = error.localizedDescription
            isLoading = false
        }
    }

    func logout() {
        do {
            try authRepository.logout()
            try keychain.delete(key: "accessToken")
            try keychain.delete(key: "refreshToken")
            self.currentUser = nil
            self.isAuthenticated = false
        } catch {
            self.error = "Erro ao fazer logout: \(error.localizedDescription)"
        }
    }
}

// MARK: - Firebase Integration Helpers

struct GoogleSignInHelper {
    static func getIdToken(completion: @escaping (String?, Error?) -> Void) {
        guard let clientID = FirebaseApp.app()?.options.clientID else {
            completion(nil, AuthError.missingGoogleClientID)
            return
        }

        let config = GIDConfiguration(clientID: clientID)
        GIDSignIn.sharedInstance.configuration = config

        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootViewController = windowScene.windows.first?.rootViewController else {
            completion(nil, AuthError.missingViewController)
            return
        }

        GIDSignIn.sharedInstance.signIn(withPresenting: rootViewController) { result, error in
            guard error == nil else {
                completion(nil, error)
                return
            }

            guard let result = result else {
                completion(nil, AuthError.invalidGoogleResult)
                return
            }

            let idToken = result.user.idToken?.tokenString
            completion(idToken, nil)
        }
    }
}

struct AppleSignInHelper {
    static func signIn(completion: @escaping (String?, String?, Error?) -> Void) {
        // Placeholder - requires ASAuthorizationController integration
        // This would be implemented with ASAuthorizationAppleIDProvider
        completion(nil, nil, AuthError.notImplemented)
    }
}

enum AuthError: LocalizedError {
    case missingGoogleClientID
    case missingViewController
    case invalidGoogleResult
    case notImplemented

    var errorDescription: String? {
        switch self {
        case .missingGoogleClientID:
            return "Google Client ID not configured"
        case .missingViewController:
            return "No view controller available for sign-in"
        case .invalidGoogleResult:
            return "Invalid Google sign-in result"
        case .notImplemented:
            return "Feature not yet implemented"
        }
    }
}
