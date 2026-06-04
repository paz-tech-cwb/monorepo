import SwiftUI
import Shared

struct AccountView: View {
    @State private var viewModel: AccountViewModel
    @Environment(AuthenticationCoordinator.self) private var authCoordinator
    @State private var showLogin = false

    init(userRepository: UserRepository, authRepository: AuthRepository) {
        _viewModel = State(initialValue: AccountViewModel(
            userRepository: userRepository,
            authRepository: authRepository
        ))
    }

    var body: some View {
        NavigationStack {
            ZStack {
                if viewModel.isLoading {
                    loadingState
                } else {
                    contentState
                }
            }
            .navigationTitle("Conta")
        }
        .onAppear {
            if !viewModel.isLoading {
                showLogin = !authCoordinator.isAuthenticated
            }
        }
        .onChange(of: viewModel.isLoading) { _, isLoading in
            if !isLoading { showLogin = !authCoordinator.isAuthenticated }
        }
        .onChange(of: authCoordinator.isAuthenticated) { _, isAuthenticated in
            if isAuthenticated {
                showLogin = false
                viewModel.reload()
            } else {
                showLogin = true
            }
        }
        .fullScreenCover(isPresented: $showLogin) {
            LoginView(
                authCoordinator: authCoordinator,
                onDismiss: { showLogin = false }
            )
        }
    }

    @ViewBuilder
    private var contentState: some View {
        ScrollView {
            VStack(spacing: PazSpacing.lg) {
                // Hero header
                VStack(alignment: .leading, spacing: PazSpacing.sm) {
                    Text("Minha Conta")
                        .font(PazTypography.headlineSmall)
                        .foregroundColor(.white)
                    Text("Gerencie suas informações")
                        .font(PazTypography.bodySmall)
                        .foregroundColor(.white.opacity(0.8))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(PazSpacing.lg)
                .background(PazColors.heroGradient)
                .cornerRadius(16)
                .padding(.horizontal, PazSpacing.lg)
                .padding(.top, PazSpacing.lg)

                // Profile card
                if let user = viewModel.user {
                    VStack(spacing: PazSpacing.md) {
                        Circle()
                            .fill(PazColors.primary.opacity(0.2))
                            .frame(width: 80, height: 80)
                            .overlay(
                                Text(user.name.prefix(1).uppercased())
                                    .font(PazTypography.headlineLarge)
                                    .foregroundColor(PazColors.primary)
                            )

                        Text(user.name)
                            .font(PazTypography.titleMedium)

                        Text(user.email)
                            .font(PazTypography.bodySmall)
                            .foregroundColor(.gray)

                        Text(user.role.displayName)
                            .font(PazTypography.labelSmall)
                            .foregroundColor(PazColors.primary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 4)
                            .background(PazColors.primary.opacity(0.12))
                            .cornerRadius(20)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(PazSpacing.lg)
                    .background(PazColors.surface)
                    .cornerRadius(16)
                    .padding(.horizontal, PazSpacing.lg)

                    // Navigation menu
                    VStack(spacing: 0) {
                        NavigationLink(destination: MemberJourneyView(memberJourneyRepository: IosAppContainer.shared.memberJourneyRepository)) {
                            MenuRow(title: "Minha Jornada", icon: "figure.walk")
                        }
                        Divider().padding(.horizontal, PazSpacing.lg)
                        NavigationLink(destination: MeetingReportView(
                            formsRepository: IosAppContainer.shared.formsRepository,
                            authRepository: IosAppContainer.shared.authRepository
                        )) {
                            MenuRow(title: "Relatório de Reunião", icon: "doc.text")
                        }
                        Divider().padding(.horizontal, PazSpacing.lg)
                        NavigationLink(destination: FormulariosView(formsRepository: IosAppContainer.shared.formsRepository)) {
                            MenuRow(title: "Formulários", icon: "list.clipboard")
                        }
                        Divider().padding(.horizontal, PazSpacing.lg)
                        NavigationLink(destination: MinistriesView(churchRepository: IosAppContainer.shared.churchRepository)) {
                            MenuRow(title: "Ministérios & Grupos", icon: "person.3.fill")
                        }
                        Divider().padding(.horizontal, PazSpacing.lg)
                        NavigationLink(destination: NotificationPrefsView()) {
                            MenuRow(title: "Notificações", icon: "bell.fill")
                        }
                        Divider().padding(.horizontal, PazSpacing.lg)
                        Button(action: { viewModel.onToggleDarkMode() }) {
                            HStack(spacing: PazSpacing.md) {
                                Image(systemName: "moon.fill")
                                    .font(.system(size: 16))
                                    .foregroundColor(PazColors.primary)
                                Text("Modo Escuro")
                                    .font(PazTypography.bodyMedium)
                                    .foregroundColor(PazColors.onSurface)
                                Spacer()
                                Toggle("", isOn: $viewModel.isDarkMode)
                                    .labelsHidden()
                            }
                            .padding(.horizontal, PazSpacing.lg)
                            .padding(.vertical, PazSpacing.md)
                        }
                        Divider().padding(.horizontal, PazSpacing.lg)
                        Button(action: { viewModel.onLogout() }) {
                            MenuRow(title: "Sair da Conta", icon: "door.left.hand.open", tintIcon: false)
                        }
                    }
                    .background(PazColors.surface)
                    .cornerRadius(16)
                    .padding(.horizontal, PazSpacing.lg)

                    NavigationLink(destination: ProfileView(authRepository: IosAppContainer.shared.authRepository)) {
                        Text("Ver Perfil Completo")
                            .font(PazTypography.titleMedium)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, PazSpacing.md)
                            .background(PazColors.primary)
                            .cornerRadius(12)
                    }
                    .padding(.horizontal, PazSpacing.lg)
                }

                Spacer().frame(height: PazSpacing.xl)
            }
            .background(PazColors.background)
        }
    }

    @ViewBuilder
    private var loadingState: some View {
        ScrollView {
            VStack(spacing: PazSpacing.lg) {
                SkeletonView().frame(height: 100).padding(.horizontal, PazSpacing.lg).padding(.top, PazSpacing.lg)
                SkeletonView().frame(height: 120).padding(.horizontal, PazSpacing.lg)
                ForEach(0..<4, id: \.self) { _ in
                    SkeletonView().frame(height: 50).padding(.horizontal, PazSpacing.lg)
                }
                Spacer()
            }
        }
    }
}

private struct MenuRow: View {
    let title: String
    let icon: String
    var tintIcon = true

    var body: some View {
        HStack(spacing: PazSpacing.md) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(tintIcon ? PazColors.primary : .gray)
            Text(title)
                .font(PazTypography.bodyMedium)
                .foregroundColor(PazColors.onSurface)
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 14))
                .foregroundColor(.gray)
        }
        .padding(.horizontal, PazSpacing.lg)
        .padding(.vertical, PazSpacing.md)
    }
}

#Preview {
    AccountView(
        userRepository: IosAppContainer.shared.userRepository,
        authRepository: IosAppContainer.shared.authRepository
    )
}
