import FirebaseAuth
import FirebaseCore
import GoogleSignIn
import Observation
import Shared
import SwiftUI

@MainActor
@Observable
class AuthenticationCoordinator {
    var isAuthenticated = false
    var currentUser: Shared.User?
    var isLoading = false
    var isInitializing = true
    var error: String?

    private let authRepository: AuthRepository

    init(authRepository: AuthRepository) {
        self.authRepository = authRepository
        checkAuthState()
    }

    private func checkAuthState() {
        Task {
            do {
                let tokens = try await authRepository.storedTokens()
                if tokens != nil {
                    let user = try await authRepository.currentUser()
                    self.currentUser = user
                    self.isAuthenticated = true
                    self.isInitializing = false
                    return
                }
            } catch {}

            // No stored tokens — try silent Firebase re-auth before showing login
            await silentReAuth()
            self.isInitializing = false
        }
    }

    /// Attempts to refresh the session silently using the existing Firebase user.
    func silentReAuth() async {
        guard let firebaseUser = Auth.auth().currentUser else {
            isAuthenticated = false
            return
        }
        guard let rawProvider = firebaseUser.providerData.first(where: { $0.providerID != "firebase" })?.providerID else {
            isAuthenticated = false
            return
        }
        let provider = rawProvider == "google.com" ? "google" : "apple"
        do {
            let idToken = try await firebaseUser.getIDToken(forcingRefresh: true)
            let user = try await IosAppContainer.shared.socialLogin(idToken: idToken, provider: provider)
            self.currentUser = user
            self.isAuthenticated = true
        } catch {
            self.isAuthenticated = false
        }
    }

    func signInWithGoogle(idToken: String) async {
        isLoading = true
        error = nil
        do {
            let user = try await IosAppContainer.shared.socialLogin(idToken: idToken, provider: "google")
            self.currentUser = user
            self.isAuthenticated = true
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func signInWithApple(idToken: String, nonce: String) async {
        isLoading = true
        error = nil
        do {
            let user = try await IosAppContainer.shared.socialLogin(idToken: idToken, provider: "apple")
            self.currentUser = user
            self.isAuthenticated = true
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func logout() {
        Task {
            do {
                try await IosAppContainer.shared.logout()
                GIDSignIn.sharedInstance.signOut()
                try? Auth.auth().signOut()
            } catch {
                self.error = "Erro ao fazer logout: \(error.localizedDescription)"
            }
            self.currentUser = nil
            self.isAuthenticated = false
        }
    }
}

// MARK: - Firebase Integration Helpers

enum GoogleSignInHelper {
    /// CLIENT_ID from GoogleService-Info.plist (iOS client ID, not the web client ID)
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

            guard let result else {
                completion(nil, AuthError.invalidGoogleResult)
                return
            }

            result.user.refreshTokensIfNeeded { user, error in
                guard let user, error == nil,
                      let googleIdToken = user.idToken?.tokenString else {
                    completion(nil, error ?? AuthError.invalidGoogleResult)
                    return
                }
                let credential = GoogleAuthProvider.credential(
                    withIDToken: googleIdToken,
                    accessToken: user.accessToken.tokenString
                )
                Auth.auth().signIn(with: credential) { authResult, firebaseError in
                    guard let firebaseUser = authResult?.user, firebaseError == nil else {
                        completion(nil, firebaseError ?? AuthError.invalidGoogleResult)
                        return
                    }
                    firebaseUser.getIDToken { firebaseIdToken, tokenError in
                        completion(firebaseIdToken, tokenError)
                    }
                }
            }
        }
    }
}

enum AppleSignInHelper {
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
        case .missingGoogleClientID: "Google Client ID not configured"
        case .missingViewController: "No view controller available for sign-in"
        case .invalidGoogleResult: "Invalid Google sign-in result"
        case .notImplemented: "Feature not yet implemented"
        }
    }
}
