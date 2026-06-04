import SwiftUI
import AuthenticationServices
import CryptoKit
import Shared

struct LoginView: View {
    var authCoordinator: AuthenticationCoordinator
    var onDismiss: (() -> Void)? = nil

    @State private var isLoading = false
    @State private var currentNonce: String?

    @Environment(\.colorScheme) private var colorScheme
    private var isDark: Bool { colorScheme == .dark }

    var body: some View {
        ZStack(alignment: .top) {
            // Page background below the card
            (isDark ? Color(hex: "070E1A") : Color(hex: "EDF1F7"))
                .ignoresSafeArea()

            // ── Hero ──────────────────────────────────────────────────────
            heroZone
                .frame(maxWidth: .infinity)
                .frame(height: 380)
                .ignoresSafeArea(edges: .top)

            // ── Card (overlaps hero by 48pt) ──────────────────────────────
            VStack(spacing: 0) {
                Spacer().frame(height: 332)   // 380 - 48
                loginCard
                    .padding(.horizontal, 16)
                Spacer()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }

    // MARK: - Hero

    @ViewBuilder
    private var heroZone: some View {
        ZStack {
            PazColors.heroGradient

            // Top scrim for status bar readability
            LinearGradient(
                colors: [Color.black.opacity(0.55), .clear],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 120)
            .frame(maxHeight: .infinity, alignment: .top)

            // Ghost cross watermark
            Text("✝")
                .font(.system(size: 200, weight: .bold))
                .foregroundStyle(.white.opacity(0.07))

            // Close button (modal context only)
            if let onDismiss {
                Button(action: onDismiss) {
                    Image(systemName: "xmark")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.85))
                        .padding(10)
                        .background(.white.opacity(0.15), in: Circle())
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                .padding(.top, 56)
                .padding(.trailing, 20)
            }
        }
    }

    // MARK: - Card

    @ViewBuilder
    private var loginCard: some View {
        let cardBg     = isDark ? Color(hex: "0D1826") : Color.white
        let titleColor = isDark ? PazColors.pazSky     : PazColors.pazPrimary
        let slateColor = isDark ? PazColors.slate      : Color(hex: "5A6B82")

        VStack(spacing: 0) {
            Text("Paz Church")
                .font(PazTypography.displayLarge)
                .foregroundStyle(titleColor)
                .multilineTextAlignment(.center)

            Spacer().frame(height: 14)

            RoundedRectangle(cornerRadius: 2)
                .fill(PazColors.pazGold)
                .frame(width: 32, height: 2)

            Spacer().frame(height: 14)

            Text("Uma comunidade de fé, amor e propósito.")
                .font(PazTypography.bodyLarge)
                .foregroundStyle(slateColor)
                .multilineTextAlignment(.center)

            Spacer().frame(height: 22)

            // Google
            authButton(
                text:      "Continuar com Google",
                sfSymbol:  "g.circle.fill",
                isApple:   false,
                isLoading: isLoading,
                action:    { signInWithGoogle() }
            )

            Spacer().frame(height: 11)

            // Apple — nonce lifecycle:
            // 1. Generate raw nonce here (before request)
            // 2. Send SHA256(nonce) so Apple embeds it in the ID token
            // 3. Pass raw nonce to backend to verify the claim
            SignInWithAppleButton(.signIn) { request in
                let nonce = randomNonceString()
                currentNonce = nonce
                request.requestedScopes = [.fullName, .email]
                request.nonce = sha256(nonce)
            } onCompletion: { result in
                handleAppleSignIn(result, rawNonce: currentNonce)
            }
            .frame(height: 54)
            .clipShape(Capsule())

            if let error = authCoordinator.error {
                Spacer().frame(height: 12)
                Text(error)
                    .font(PazTypography.bodySmall)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
            }

            Spacer().frame(height: 15)

            Button {
                onDismiss?()
            } label: {
                Text("Explorar como visitante")
                    .font(PazTypography.bodySmall)
                    .foregroundStyle(slateColor)
                    .underline()
            }
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 26)
        .background(cardBg, in: RoundedRectangle(cornerRadius: 26))
        .overlay(
            RoundedRectangle(cornerRadius: 26)
                .stroke(Color(hex: "032E58").opacity(0.06), lineWidth: 1)
        )
        .shadow(color: Color(hex: "032E58").opacity(0.40), radius: 22, x: 0, y: 20)
        .shadow(color: Color(hex: "032E58").opacity(0.06), radius: 4,  x: 0, y: 2)
    }

    @ViewBuilder
    private func authButton(
        text: String,
        sfSymbol: String,
        isApple: Bool,
        isLoading: Bool,
        action: @escaping () -> Void
    ) -> some View {
        let bg = isApple
            ? (isDark ? Color.white.opacity(0.10) : .black)
            : (isDark ? Color(hex: "101F31")      : .white)
        let fg: Color = isApple
            ? .white
            : (isDark ? Color(hex: "EAEFF7") : Color(hex: "16243A"))
        let border = isApple
            ? (isDark ? Color.white.opacity(0.20) : .clear)
            : (isDark ? Color(hex: "1C2A3D")      : Color(hex: "E7ECF3"))

        Button(action: action) {
            HStack(spacing: 10) {
                if isLoading {
                    ProgressView().tint(fg)
                } else {
                    Image(systemName: sfSymbol)
                        .font(.system(size: 18, weight: .medium))
                    Text(text)
                        .font(.custom("DMSans-SemiBold", size: 15.5))
                }
            }
            .foregroundStyle(fg)
            .frame(maxWidth: .infinity)
            .frame(height: 54)
        }
        .background(bg, in: Capsule())
        .overlay(Capsule().stroke(border, lineWidth: 1))
        .disabled(isLoading)
    }

    // MARK: - Google Sign-In

    private func signInWithGoogle() {
        isLoading = true
        GoogleSignInHelper.getIdToken { idToken, error in
            if let error {
                if !error.localizedDescription.lowercased().contains("cancel") {
                    authCoordinator.error = error.localizedDescription
                }
                isLoading = false
                return
            }
            guard let idToken else { isLoading = false; return }
            Task {
                await authCoordinator.signInWithGoogle(idToken: idToken)
                isLoading = false
                if authCoordinator.isAuthenticated { onDismiss?() }
            }
        }
    }

    // MARK: - Apple Sign-In

    private func handleAppleSignIn(_ result: Result<ASAuthorization, Error>, rawNonce: String?) {
        switch result {
        case .success(let authorization):
            guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let idTokenData = appleIDCredential.identityToken,
                  let idToken = String(data: idTokenData, encoding: .utf8),
                  let rawNonce else {
                authCoordinator.error = "Apple Sign-In state error: missing nonce"
                return
            }
            Task {
                await authCoordinator.signInWithApple(idToken: idToken, nonce: rawNonce)
                if authCoordinator.isAuthenticated { onDismiss?() }
            }
        case .failure(let error):
            if let authError = error as? ASAuthorizationError, authError.code == .canceled { return }
            authCoordinator.error = error.localizedDescription
        }
    }

    // MARK: - Nonce Helpers

    private func randomNonceString(length: Int = 32) -> String {
        precondition(length > 0)
        var randomBytes = [UInt8](repeating: 0, count: length)
        let errorCode = SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes)
        precondition(errorCode == errSecSuccess, "SecRandomCopyBytes failed: \(errorCode)")
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        return String(randomBytes.map { charset[Int($0) % charset.count] })
    }

    private func sha256(_ input: String) -> String {
        let inputData = Data(input.utf8)
        let hashedData = SHA256.hash(data: inputData)
        return hashedData.compactMap { String(format: "%02x", $0) }.joined()
    }
}

#Preview {
    LoginView(authCoordinator: AuthenticationCoordinator(authRepository: IosAppContainer.shared.authRepository))
}
