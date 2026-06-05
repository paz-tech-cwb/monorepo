import Shared
import SwiftUI

struct ProfileView: View {
    @State private var viewModel: ProfileViewModel
    @Environment(\.dismiss) private var dismiss
    @Environment(AuthenticationCoordinator.self) private var authCoordinator

    init(authRepository: AuthRepository) {
        _viewModel = State(initialValue: ProfileViewModel(authRepository: authRepository))
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                PazColors.background.ignoresSafeArea()
                VStack(spacing: 0) {
                    heroHeader
                    ZStack(alignment: .top) {
                        PazColors.background.ignoresSafeArea(edges: .bottom)
                        screenContent
                    }
                }
            }
            .navigationBarHidden(true)
        }
        .task { await viewModel.loadUser() }
    }

    @ViewBuilder
    private var screenContent: some View {
        if viewModel.isLoading { loadingState }
        else if viewModel.user == nil { loggedOutState }
        else { loggedInState }
    }

    private var heroHeader: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Meu Perfil").font(PazTypography.bodySmall).foregroundStyle(.white.opacity(0.5))
            Text(viewModel.user?.name ?? "Perfil").font(PazTypography.headlineMedium).foregroundStyle(.white)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 24)
        .padding(.top, 16)
        .padding(.bottom, 44)
        .background(PazColors.heroGradient)
    }

    private var loggedInState: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Avatar card overlapping hero
                VStack(spacing: 12) {
                    ZStack(alignment: .bottomTrailing) {
                        Circle().fill(PazColors.pazPrimary.opacity(0.15)).frame(width: 80, height: 80)
                            .overlay(
                                Text(viewModel.user?.name.prefix(1).uppercased() ?? "")
                                    .font(PazTypography.headlineLarge).foregroundStyle(PazColors.pazPrimary)
                            )
                        Circle().fill(PazColors.pazGold).frame(width: 26, height: 26)
                            .overlay(Image(systemName: "pencil").font(.system(size: 11, weight: .bold))
                                .foregroundStyle(Color(hex: "3A2600")))
                    }
                    Text(viewModel.user?.name ?? "").font(PazTypography.headlineSmall)
                    Text(viewModel.user?.email ?? "").font(PazTypography.bodySmall).foregroundStyle(PazColors.slate)
                    Text(viewModel.user?.role.displayName ?? "")
                        .font(PazTypography.labelSmall).foregroundStyle(PazColors.pazPrimary)
                        .padding(.horizontal, 12).padding(.vertical, 4)
                        .background(PazColors.pazPrimary.opacity(0.12)).clipShape(Capsule())
                }
                .frame(maxWidth: .infinity)
                .padding(24)
                .background(PazColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: 22))
                .shadow(color: .black.opacity(0.07), radius: 16, y: 6)
                .padding(.horizontal, 20)
                .offset(y: -22)

                VStack(spacing: 16) {
                    NavigationLink(destination: EditProfileView()) {
                        Text("Editar Perfil")
                            .font(PazTypography.titleMedium).foregroundStyle(.white)
                            .frame(maxWidth: .infinity).frame(height: 50)
                            .background(PazColors.pazPrimary)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .padding(.horizontal, 20)

                    VStack(spacing: 0) {
                        Button(action: { viewModel.onLogout() }) {
                            HStack(spacing: 16) {
                                PazIconContainer(icon: "door.left.hand.open", tint: PazColors.error)
                                Text("Sair da conta").font(PazTypography.bodyMedium).foregroundStyle(PazColors.error)
                                Spacer()
                                Image(systemName: "chevron.right").font(.system(size: 13))
                                    .foregroundStyle(PazColors.slateLight)
                            }
                            .padding(.horizontal, 16).padding(.vertical, 12)
                        }
                        .buttonStyle(.plain)
                    }
                    .background(PazColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 18))
                    .padding(.horizontal, 20)
                }
                .padding(.top, 4)
                Spacer().frame(height: 32)
            }
        }
    }

    private var loggedOutState: some View {
        ScrollView {
            VStack(spacing: 20) {
                Spacer().frame(height: 24)
                ZStack {
                    Circle().strokeBorder(
                        PazColors.pazPrimary.opacity(0.25),
                        style: StrokeStyle(lineWidth: 2, dash: [6])
                    )
                    .frame(width: 80, height: 80)
                    Image(systemName: "person.fill").font(.system(size: 32))
                        .foregroundStyle(PazColors.pazPrimary.opacity(0.4))
                }
                VStack(spacing: 6) {
                    Text("Bem-vindo(a)!").font(PazTypography.titleMedium)
                    Text("Faça login para ver seu perfil e acompanhar sua jornada na Paz Church")
                        .font(PazTypography.bodySmall).foregroundStyle(PazColors.slate).multilineTextAlignment(.center)
                }
                .padding(.horizontal, 24)
                VStack(alignment: .leading, spacing: 12) {
                    Text("Entre na comunidade").font(PazTypography.titleMedium).foregroundStyle(.white)
                    Text("Conecte-se com sua família de fé").font(PazTypography.bodySmall)
                        .foregroundStyle(.white.opacity(0.8))
                    NavigationLink(destination: LoginView(authCoordinator: authCoordinator)) {
                        Text("Entrar na minha conta")
                            .font(PazTypography.titleSmall).foregroundStyle(PazColors.pazPrimary)
                            .frame(maxWidth: .infinity).padding(.vertical, 14)
                            .background(.white).clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                }
                .padding(24)
                .background(PazColors.featuredCardGradient)
                .clipShape(RoundedRectangle(cornerRadius: 18))
                .padding(.horizontal, 20)
                Spacer().frame(height: 32)
            }
        }
    }

    private var loadingState: some View {
        VStack(spacing: 16) {
            Spacer().frame(height: 20)
            SkeletonView().frame(width: 80, height: 80).clipShape(Circle())
            SkeletonView().frame(height: 24).frame(maxWidth: 200)
            SkeletonView().frame(height: 16).frame(maxWidth: 150)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity).padding(20)
    }
}

#Preview("Logged In — Light") {
    ProfileView(authRepository: IosAppContainer.shared.authRepository)
        .environment(AuthenticationCoordinator(authRepository: IosAppContainer.shared.authRepository))
}

#Preview("Logged In — Dark") {
    ProfileView(authRepository: IosAppContainer.shared.authRepository)
        .environment(AuthenticationCoordinator(authRepository: IosAppContainer.shared.authRepository))
        .preferredColorScheme(.dark)
}

#Preview("Logged Out") {
    ProfileView(authRepository: IosAppContainer.shared.authRepository)
        .environment(AuthenticationCoordinator(authRepository: IosAppContainer.shared.authRepository))
}
