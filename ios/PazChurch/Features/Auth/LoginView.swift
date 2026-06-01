import SwiftUI
import AuthenticationServices
import CryptoKit
import Shared

struct LoginView: View {
    @ObservedObject var authCoordinator: AuthenticationCoordinator
    @State private var isLoading = false
    // The raw nonce must be generated before the Apple request is submitted.
    // Apple embeds SHA256(rawNonce) in the ID token; we pass rawNonce to the
    // backend so it can verify the claim. A nonce generated after completion
    // is unverifiable and lets attackers replay stolen tokens.
    @State private var currentNonce: String?

    var body: some View {
        NavigationStack {
            ZStack {
                VStack(spacing: 0) {
                    // Hero gradient
                    VStack(alignment: .leading, spacing: PazSpacing.xl) {
                        Text("Paz Church")
                            .font(PazTypography.headlineMedium)
                            .foregroundColor(.white)

                        VStack(alignment: .leading, spacing: PazSpacing.sm) {
                            Text("Bem-vindo de volta!")
                                .font(PazTypography.bodyMedium)
                                .foregroundColor(.white.opacity(0.9))
                            Text("Faça login para continuar")
                                .font(PazTypography.bodySmall)
                                .foregroundColor(.white.opacity(0.7))
                        }

                        Spacer()
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                    .padding(PazSpacing.lg)
                    .background(PazColors.heroGradient)

                    // Login buttons
                    VStack(spacing: PazSpacing.lg) {
                        Spacer().frame(height: PazSpacing.xl)

                        VStack(spacing: PazSpacing.md) {
                            // Google Sign-In
                            Button(action: { signInWithGoogle() }) {
                                if isLoading {
                                    ProgressView()
                                        .tint(.white)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, PazSpacing.md)
                                } else {
                                    HStack(spacing: PazSpacing.md) {
                                        Image(systemName: "g.circle.fill")
                                            .font(.system(size: 20))
                                        Text("Entrar com Google")
                                            .font(PazTypography.titleMedium)
                                        Spacer()
                                    }
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, PazSpacing.md)
                                }
                            }
                            .disabled(isLoading)
                            .background(Color(red: 0.2, green: 0.2, blue: 0.2))
                            .cornerRadius(12)

                            // Apple Sign-In — nonce lifecycle:
                            // 1. Generate raw nonce here (before request)
                            // 2. Send SHA256(nonce) on the request so Apple embeds it in the token
                            // 3. Pass the raw nonce to the backend in onCompletion
                            // 4. Backend verifies SHA256(rawNonce) == nonce claim in Apple ID token
                            SignInWithAppleButton(.signIn) { request in
                                let nonce = randomNonceString()
                                currentNonce = nonce
                                request.requestedScopes = [.fullName, .email]
                                request.nonce = sha256(nonce)
                            } onCompletion: { result in
                                handleAppleSignIn(result, rawNonce: currentNonce)
                            }
                            .frame(height: 48)
                            .cornerRadius(12)
                        }

                        if let error = authCoordinator.error {
                            VStack(alignment: .leading, spacing: PazSpacing.sm) {
                                HStack(spacing: PazSpacing.sm) {
                                    Image(systemName: "exclamationmark.circle.fill")
                                        .font(.system(size: 14))
                                    Text("Erro de Login")
                                        .font(PazTypography.labelSmall)
                                }
                                Text(error)
                                    .font(PazTypography.bodySmall)
                            }
                            .foregroundColor(.red)
                            .padding(PazSpacing.md)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(12)
                        }

                        Spacer()
                    }
                    .padding(.horizontal, PazSpacing.lg)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(PazColors.background)
                }
                .background(PazColors.background)
            }
        }
        .navigationBarBackButtonHidden()
    }

    // MARK: - Google Sign-In

    private func signInWithGoogle() {
        isLoading = true

        GoogleSignInHelper.getIdToken { idToken, error in
            if let error = error {
                authCoordinator.error = error.localizedDescription
                isLoading = false
                return
            }

            guard let idToken = idToken else {
                authCoordinator.error = "Failed to get Google ID token"
                isLoading = false
                return
            }

            Task {
                await authCoordinator.signInWithGoogle(idToken: idToken)
                isLoading = false
            }
        }
    }

    // MARK: - Apple Sign-In

    private func handleAppleSignIn(_ result: Result<ASAuthorization, Error>, rawNonce: String?) {
        switch result {
        case .success(let authorization):
            guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential else {
                authCoordinator.error = "Invalid Apple credentials"
                return
            }

            guard let idTokenData = appleIDCredential.identityToken,
                  let idToken = String(data: idTokenData, encoding: .utf8) else {
                authCoordinator.error = "Failed to get Apple ID token"
                return
            }

            guard let rawNonce = rawNonce else {
                // This should never happen if SignInWithAppleButton is wired correctly.
                // If currentNonce is nil the nonce was never set on the request, so we
                // cannot verify the token — refuse the login.
                authCoordinator.error = "Apple Sign-In state error: missing nonce"
                return
            }

            Task {
                await authCoordinator.signInWithApple(idToken: idToken, nonce: rawNonce)
            }

        case .failure(let error):
            if let authError = error as? ASAuthorizationError, authError.code == .canceled {
                return
            }
            authCoordinator.error = error.localizedDescription
        }
    }

    // MARK: - Nonce Helpers

    /// Generates a cryptographically random nonce string using SecRandomCopyBytes.
    private func randomNonceString(length: Int = 32) -> String {
        precondition(length > 0)
        var randomBytes = [UInt8](repeating: 0, count: length)
        let errorCode = SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes)
        precondition(errorCode == errSecSuccess, "SecRandomCopyBytes failed: \(errorCode)")

        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        return String(randomBytes.map { charset[Int($0) % charset.count] })
    }

    /// Returns the hex-encoded SHA256 of the input string.
    private func sha256(_ input: String) -> String {
        let inputData = Data(input.utf8)
        let hashedData = SHA256.hash(data: inputData)
        return hashedData.compactMap { String(format: "%02x", $0) }.joined()
    }
}

#Preview {
    LoginView(authCoordinator: AuthenticationCoordinator(authRepository: IosAppContainer.shared.authRepository))
}
