import SwiftUI
import Combine
import Shared
import FirebaseAuth
import FirebaseCore
import GoogleSignIn

@MainActor
class AuthenticationCoordinator: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: Shared.User?
    @Published var isLoading = true
    @Published var error: String?

    private let authRepository: AuthRepository
    private let keychain = KeychainService.shared

    init(authRepository: AuthRepository) {
        self.authRepository = authRepository
        checkAuthState()
    }

    private func checkAuthState() {
        Task {
            do {
                if let _ = try keychain.retrieve(key: "accessToken") {
                    let user = try await authRepository.currentUser()
                    if user != nil {
                        self.currentUser = user
                        self.isAuthenticated = true
                        self.isLoading = false
                        return
                    }
                }
            } catch {
                // Token lookup failed; treat as logged out
            }

            self.isAuthenticated = false
            self.currentUser = nil
            self.isLoading = false
        }
    }

    func signInWithGoogle(idToken: String) async {
        isLoading = true
        error = nil

        do {
            let user = try await IosAppContainer.shared.socialLogin(idToken: idToken, provider: "google")
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
            let user = try await IosAppContainer.shared.socialLogin(idToken: idToken, provider: "apple")
            self.currentUser = user
            self.isAuthenticated = true
            isLoading = false
        } catch {
            self.error = error.localizedDescription
            isLoading = false
        }
    }

    func logout() {
        Task {
            do {
                try await IosAppContainer.shared.logout()
                try? keychain.delete(key: "accessToken")
                try? keychain.delete(key: "refreshToken")
            } catch {
                self.error = "Erro ao fazer logout: \(error.localizedDescription)"
            }
            self.currentUser = nil
            self.isAuthenticated = false
        }
    }
}

// MARK: - Firebase Integration Helpers

struct GoogleSignInHelper {
    // CLIENT_ID from GoogleService-Info.plist (iOS client ID, not the web client ID)
    private static let clientID = "139667803306-vbo7nbgufjpr464k2ko91gnbvodjo9v7.apps.googleusercontent.com"

    static func getIdToken(completion: @escaping (String?, Error?) -> Void) {
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

            result.user.refreshTokensIfNeeded { user, error in
                guard let user = user, error == nil else {
                    completion(nil, error ?? AuthError.invalidGoogleResult)
                    return
                }
                completion(user.idToken?.tokenString, nil)
            }
        }
    }
}

struct AppleSignInHelper {
    static func signIn(completion: @escaping (String?, String?, Error?) -> Void) {
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
        case .missingGoogleClientID:    return "Google Client ID not configured"
        case .missingViewController:    return "No view controller available for sign-in"
        case .invalidGoogleResult:      return "Invalid Google sign-in result"
        case .notImplemented:           return "Feature not yet implemented"
        }
    }
}
