import SwiftUI
import AuthenticationServices

struct LoginView: View {
    @ObservedObject var authCoordinator: AuthenticationCoordinator
    @State private var isLoading = false
    @State private var showError = false

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

                            // Apple Sign-In
                            SignInWithAppleButton(.signIn) { request in
                                request.requestedScopes = [.fullName, .email]
                            } onCompletion: { result in
                                handleAppleSignIn(result)
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

    private func handleAppleSignIn(_ result: Result<ASAuthorization, Error>) {
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

            let nonce = UUID().uuidString

            Task {
                await authCoordinator.signInWithApple(idToken: idToken, nonce: nonce)
            }

        case .failure(let error):
            if let authError = error as? ASAuthorizationError, authError.code == .canceled {
                // User cancelled, don't show error
                return
            }
            authCoordinator.error = error.localizedDescription
        }
    }
}

#Preview {
    LoginView(authCoordinator: AuthenticationCoordinator(authRepository: AuthRepositoryImpl()))
}
