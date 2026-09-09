import AuthenticationServices
import CryptoKit
import Shared
import SwiftUI

struct LoginView: View {
    var authCoordinator: AuthenticationCoordinator
    var onDismiss: (() -> Void)?
    var isEmbedded: Bool = false

    @State private var isLoading = false
    @State private var currentNonce: String?

    @Environment(\.colorScheme) private var colorScheme
    private var isDark: Bool {
        colorScheme == .dark
    }

    // MARK: - Body

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .top) {
                // ── Hero image — full screen ──
                Image("welcome-pazchurch")
                    .resizable()
                    .scaledToFill()
                    .frame(width: geo.size.width, height: geo.size.height)
                    .clipped()
                    .ignoresSafeArea()

                // ── Status bar scrim ──
                LinearGradient(
                    colors: [Color.black.opacity(0.45), .clear],
                    startPoint: .top,
                    endPoint: .init(x: 0.5, y: 0.35)
                )
                .frame(width: geo.size.width, height: 120)
                .ignoresSafeArea(edges: .top)

                // ── Close button (sheet/modal context only) ──
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

                // ── Login card — centered at 70% down ──
                loginCard
                    .frame(width: max(0, geo.size.width - 32))
                    .position(x: geo.size.width / 2, y: geo.size.height * 0.7)
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
        .ignoresSafeArea()
    }

    // MARK: - Card

    private var loginCard: some View {
        GlassCard(radius: PazSpacing.cardRadiusLarge) {
            loginCardContent
        }
        .shadow(color: .black.opacity(0.18), radius: 24, x: 0, y: 12)
    }

    private var loginCardContent: some View {
        VStack(spacing: 0) {
            Text("Paz Church")
                .font(PazTypography.displayLarge)
                .foregroundStyle(isDark ? PazColors.pazSky : PazColors.accent)
                .multilineTextAlignment(.center)

            Spacer().frame(height: 14)

            RoundedRectangle(cornerRadius: 2)
                .fill(PazColors.pazGold)
                .frame(width: 32, height: 2)

            Spacer().frame(height: 14)

            Text("Uma comunidade de fé, amor e propósito.")
                .font(PazTypography.bodyLarge)
                .foregroundStyle(PazColors.slate)
                .multilineTextAlignment(.center)

            Spacer().frame(height: 22)

            authButton(
                text: "Continuar com Google",
                imageName: "google_logo",
                isApple: false,
                isLoading: isLoading,
                action: { signInWithGoogle() }
            )

            Spacer().frame(height: 11)

            // Nonce lifecycle: generate raw nonce → send SHA256 to Apple → pass raw to backend
            // NOTE: SignInWithAppleButton is a system-provided view, not a generic `Button`,
            // so `.buttonStyle(.pazPill*)` cannot be applied to it — kept as a plain capsule.
            SignInWithAppleButton(.signIn) { request in
                let nonce = randomNonceString()
                currentNonce = nonce
                request.requestedScopes = [.fullName, .email]
                request.nonce = sha256(nonce)
            } onCompletion: { result in
                handleAppleSignIn(result, rawNonce: currentNonce)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 54)
            .clipShape(Capsule())

            if let error = authCoordinator.error {
                Spacer().frame(height: 12)
                Text(error)
                    .font(PazTypography.bodySmall)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 26)
        .sheet(isPresented: showBirthDateSheet) {
            BirthDateSheet(
                onConfirm: { date in
                    await authCoordinator.confirmBirthDate(isoDateString(from: date))
                    if authCoordinator.isAuthenticated { onDismiss?() }
                }
            )
        }
    }

    private var showBirthDateSheet: Binding<Bool> {
        Binding(
            get: { authCoordinator.needsBirthDate },
            set: { if !$0 { authCoordinator.dismissBirthDatePrompt() } }
        )
    }

    private func isoDateString(from date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = TimeZone(identifier: "UTC")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }

    // MARK: - Auth Buttons

    private func authButton(
        text: String,
        sfSymbol: String? = nil,
        imageName: String? = nil,
        isApple: Bool,
        isLoading: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 10) {
                if isLoading {
                    ProgressView()
                } else {
                    if let imageName {
                        Image(imageName)
                            .resizable()
                            .scaledToFit()
                            .frame(width: 20, height: 20)
                    } else if let sfSymbol {
                        Image(systemName: sfSymbol)
                            .font(.system(size: 19, weight: .medium))
                    }
                    Text(text)
                }
            }
        }
        .buttonStyle(isApple ? .pazPillPrimary : .pazPillSecondary)
        // Google's brand guidelines expect a solid, opaque background — the
        // secondary pill style's transparent fill disappears over a photo
        // backdrop, so give this button an explicit solid surface fill.
        // (pazPillSecondary's foreground is already PazColors.ink, so contrast holds.)
        .background(isApple ? Color.clear : PazColors.surface, in: Capsule())
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
        case let .success(authorization):
            guard
                let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential,
                let idTokenData = appleIDCredential.identityToken,
                let idToken = String(data: idTokenData, encoding: .utf8),
                let rawNonce
            else {
                authCoordinator.error = "Apple Sign-In state error: missing nonce"
                return
            }
            Task {
                await authCoordinator.signInWithApple(idToken: idToken, nonce: rawNonce)
                if authCoordinator.isAuthenticated { onDismiss?() }
            }

        case let .failure(error):
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

/// First-time sign-in for an identity the backend doesn't recognize requires a birth date
/// so it can be matched against a pre-created member record (see BirthDateRequiredException
/// in shared code).
private struct BirthDateSheet: View {
    var onConfirm: (Date) async -> Void

    @State private var selectedDate = Date()

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Text("Para confirmar sua identidade pela primeira vez, informe sua data de nascimento.")
                    .font(PazTypography.bodyMedium)
                    .foregroundStyle(PazColors.slate)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)

                DatePicker(
                    "Data de nascimento",
                    selection: $selectedDate,
                    in: ...Date(),
                    displayedComponents: .date
                )
                .datePickerStyle(.wheel)
                .labelsHidden()

                Spacer()
            }
            .padding(.top, 24)
            .navigationTitle("Nascimento")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                // The sheet dismisses reactively once `needsBirthDate` flips false inside
                // confirmBirthDate — calling dismiss() here directly would race with (and
                // wipe) the pending idToken/provider before the retry request reads them.
                ToolbarItem(placement: .confirmationAction) {
                    Button("Confirmar") {
                        Task { await onConfirm(selectedDate) }
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }
}

#Preview {
    LoginView(authCoordinator: AuthenticationCoordinator(authRepository: IosAppContainer.shared.authRepository))
}
