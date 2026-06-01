import SwiftUI
import Shared

struct ProfileView: View {
    @StateObject private var viewModel: ProfileViewModel
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject private var authCoordinator: AuthenticationCoordinator

    init(authRepository: AuthRepository) {
        _viewModel = StateObject(wrappedValue: ProfileViewModel(authRepository: authRepository))
    }

    var body: some View {
        NavigationStack {
            ZStack {
                VStack(spacing: 0) {
                    // Hero header
                    VStack(alignment: .leading) {
                        HStack {
                            Text("Meu Perfil")
                                .font(PazTypography.headlineMedium)
                                .foregroundColor(.white)
                            Spacer()
                        }
                        .padding(.horizontal, PazSpacing.lg)
                        .padding(.vertical, PazSpacing.md)
                    }
                    .background(PazColors.heroGradient)

                    // Content
                    if viewModel.isLoading {
                        loadingState
                    } else if viewModel.user == nil {
                        loggedOutState
                    } else {
                        loggedInState
                    }
                }
                .background(PazColors.background)
            }
        }
    }

    @ViewBuilder
    private var loggedInState: some View {
        ScrollView {
            VStack(spacing: PazSpacing.xl) {
                Spacer().frame(height: PazSpacing.lg)

                // Avatar and info
                VStack(spacing: PazSpacing.md) {
                    Circle()
                        .fill(PazColors.primary.opacity(0.2))
                        .frame(width: 80, height: 80)
                        .overlay(
                            Text(viewModel.user?.name.prefix(1).uppercased() ?? "")
                                .font(PazTypography.headlineLarge)
                                .foregroundColor(PazColors.primary)
                        )

                    Text(viewModel.user?.name ?? "")
                        .font(PazTypography.headlineSmall)

                    Text(viewModel.user?.email ?? "")
                        .font(PazTypography.bodySmall)
                        .foregroundColor(.gray)

                    // Role badge
                    Text(viewModel.user?.role.displayName ?? "")
                        .font(PazTypography.labelSmall)
                        .foregroundColor(PazColors.primary)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 4)
                        .background(PazColors.primary.opacity(0.12))
                        .cornerRadius(20)
                }
                .frame(maxWidth: .infinity)

                Spacer().frame(height: PazSpacing.lg)

                // Edit button
                NavigationLink(destination: EditProfileView()) {
                    Text("Editar Perfil")
                        .font(PazTypography.titleMedium)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, PazSpacing.md)
                        .background(PazColors.primary)
                        .cornerRadius(12)
                }
                .padding(.horizontal, PazSpacing.lg)

                Spacer().frame(height: PazSpacing.lg)

                // Logout menu
                VStack(spacing: 0) {
                    Button(action: { viewModel.onLogout() }) {
                        HStack(spacing: PazSpacing.md) {
                            Text("Sair da conta")
                                .font(PazTypography.titleSmall)
                                .foregroundColor(PazColors.onSurface)
                            Spacer()
                        }
                        .padding(.horizontal, PazSpacing.lg)
                        .padding(.vertical, PazSpacing.md)
                    }
                }
                .background(PazColors.surface)
                .cornerRadius(16)
                .padding(.horizontal, PazSpacing.lg)

                Spacer().frame(height: PazSpacing.xl)
            }
        }
    }

    @ViewBuilder
    private var loggedOutState: some View {
        VStack(spacing: PazSpacing.md) {
            Spacer()
            Text("Faça login para ver seu perfil")
                .font(PazTypography.titleMedium)
            Text("Acesse sua conta para gerenciar informações pessoais e preferências")
                .font(PazTypography.bodySmall)
                .foregroundColor(.gray)
            Spacer().frame(height: PazSpacing.lg)
            NavigationLink(destination: LoginView(authCoordinator: authCoordinator)) {
                Text("Entrar")
                    .font(PazTypography.titleMedium)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, PazSpacing.md)
                    .background(PazColors.primary)
                    .cornerRadius(12)
            }
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, PazSpacing.lg)
        .background(PazColors.background)
    }

    @ViewBuilder
    private var loadingState: some View {
        VStack(spacing: PazSpacing.lg) {
            Spacer().frame(height: PazSpacing.xl)
            SkeletonView()
                .frame(width: 80, height: 80)
                .clipShape(Circle())
            SkeletonView()
                .frame(height: 24)
                .frame(maxWidth: 200)
            SkeletonView()
                .frame(height: 16)
                .frame(maxWidth: 150)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(PazSpacing.lg)
        .background(PazColors.background)
    }
}

#Preview {
    ProfileView(authRepository: IosAppContainer.shared.authRepository)
        .environmentObject(AuthenticationCoordinator(authRepository: IosAppContainer.shared.authRepository))
}
