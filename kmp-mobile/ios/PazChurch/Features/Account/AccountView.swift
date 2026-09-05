import Observation
import Shared
import SwiftUI

struct AccountView: View {
    @State private var viewModel: AccountViewModel
    @Environment(AuthenticationCoordinator.self) private var authCoordinator
    @Environment(AppThemeManager.self) private var themeManager
    @Environment(PushNotificationService.self) private var pushService
    @State private var path: [DeepLinkDestination] = []

    init(userRepository: UserRepository, authRepository: AuthRepository) {
        _viewModel = State(initialValue: AccountViewModel(
            userRepository: userRepository,
            authRepository: authRepository
        ))
    }

    var body: some View {
        NavigationStack(path: $path) {
            Group {
                if viewModel.isLoading {
                    loadingState
                } else if !authCoordinator.isAuthenticated {
                    LoginView(authCoordinator: authCoordinator, isEmbedded: true)
                        .toolbar(.hidden, for: .navigationBar)
                } else {
                    contentState
                }
            }
            .navigationTitle(authCoordinator.isAuthenticated ? "Conta" : "")
            .navigationBarTitleDisplayMode(.large)
            .navigationDestination(for: DeepLinkDestination.self) { destination in
                switch destination {
                case .formularios:
                    FormulariosView(formsRepository: IosAppContainer.shared.formsRepository)
                case .memberJourney:
                    MemberJourneyView(memberJourneyRepository: IosAppContainer.shared.memberJourneyRepository)
                case let .formDetail(formId):
                    FormDetailDeepLinkView(
                        formId: formId,
                        formsRepository: IosAppContainer.shared.formsRepository
                    )
                case let .ministryDetail(ministryId):
                    MinistryDetailDeepLinkView(
                        ministryId: ministryId,
                        churchRepository: IosAppContainer.shared.churchRepository
                    )
                case let .lifeGroupDetail(lifeGroupId):
                    LifeGroupDetailDeepLinkView(
                        lifeGroupId: lifeGroupId,
                        churchRepository: IosAppContainer.shared.churchRepository
                    )
                case let .lifeGroupStudyDetail(studyId):
                    LifeGroupStudyDetailView(
                        studyId: studyId,
                        repository: IosAppContainer.shared.lifeGroupStudyRepository
                    )
                default:
                    EmptyView()
                }
            }
        }
        .task { await viewModel.reload() }
        .onChange(of: authCoordinator.isAuthenticated) { _, isAuth in
            if isAuth { Task { await viewModel.reload() } }
        }
        .onChange(of: pushService.pendingDeepLink) { _, newValue in
            guard newValue != nil,
                  let destination = pushService.deepLinkDestination
            else { return }
            switch destination {
            case .formularios, .memberJourney, .formDetail, .ministryDetail, .lifeGroupDetail, .lifeGroupStudyDetail:
                Task { @MainActor in
                    path = [destination]
                }
                pushService.consumeDeepLink()
            default:
                break
            }
        }
    }

    // MARK: - Content

    private var contentState: some View {
        ScrollView {
            VStack(spacing: 0) {
                Spacer().frame(height: 16)

                if let user = viewModel.user {
                    NavigationLink(destination: EditProfileView()) {
                        userCard(user: user)
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, 20)
                    .padding(.bottom, 24)

                    sectionLabel("MINHA IGREJA")
                    menuCard {
                        NavigationLink(destination: MemberJourneyView(memberJourneyRepository: IosAppContainer.shared
                                .memberJourneyRepository)) {
                            AccountRow(title: "Jornada do Membro", icon: "figure.walk", tint: PazColors.pazPrimaryLight)
                        }
                        .buttonStyle(.plain)
                        rowDivider
                        NavigationLink(destination: FormulariosView(formsRepository: IosAppContainer.shared
                                .formsRepository)) {
                            AccountRow(title: "Formulários", icon: "list.clipboard", tint: Color(hex: "6A1B9A"))
                        }
                        .buttonStyle(.plain)
                        rowDivider
                        NavigationLink(destination: MinistriesView(churchRepository: IosAppContainer.shared
                                .churchRepository)) {
                            AccountRow(title: "Ministérios", icon: "music.note", tint: Color(hex: "E65100"))
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 20)

                    sectionLabel("PREFERÊNCIAS")
                    menuCard {
                        NavigationLink(destination: NotificationPrefsView()) {
                            AccountRow(title: "Notificações", icon: "bell", tint: PazColors.pazPrimaryMid)
                        }
                        .buttonStyle(.plain)
                        rowDivider
                        HStack(spacing: 16) {
                            PazIconContainer(
                                icon: themeManager.isDarkMode ? "moon.fill" : "sun.max.fill",
                                tint: PazColors.pazPrimaryMid
                            )
                            Text("Modo Escuro").font(PazTypography.bodyMedium).foregroundStyle(PazColors.ink)
                            Spacer()
                            Toggle("", isOn: Bindable(themeManager).isDarkMode).labelsHidden()
                                .tint(PazColors.pazPrimaryLight)
                        }
                        .padding(.horizontal, 16).padding(.vertical, 12)
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 20)

                    menuCard {
                        Button(action: { authCoordinator.logout() }) {
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
                    .padding(.horizontal, 20)
                }

                Spacer().frame(height: 32)
            }
        }
        .background(PazColors.background)
    }

    // MARK: - Helpers

    private func userCard(user: Shared.User) -> some View {
        ZStack(alignment: .topTrailing) {
            HStack(spacing: 12) {
                ZStack {
                    Circle().fill(PazColors.pazPrimary.opacity(0.15)).frame(width: 56, height: 56)
                    Text(user.name.prefix(1).uppercased()).font(PazTypography.headlineSmall)
                        .foregroundStyle(PazColors.pazPrimary)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(user.name).font(PazTypography.titleMedium).foregroundStyle(PazColors.pazPrimary)
                    Text(user.email).font(PazTypography.bodySmall).foregroundStyle(PazColors.pazSky).lineLimit(1)
                    Spacer().frame(height: 2)
                    Text(user.role.displayName)
                        .font(PazTypography.labelSmall)
                        .foregroundStyle(PazColors.pazPrimary)
                        .padding(.horizontal, 8).padding(.vertical, 2)
                        .background(PazColors.pazPrimary.opacity(0.12))
                        .clipShape(Capsule())
                }
                Spacer()
            }
            .padding(16)
            .background(PazColors.tint)
            .clipShape(RoundedRectangle(cornerRadius: 22))
            .overlay(RoundedRectangle(cornerRadius: 22).stroke(PazColors.pazPrimary.opacity(0.13), lineWidth: 1))

            Image(systemName: "pencil")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(PazColors.pazPrimary)
                .padding(8)
                .background(PazColors.surface)
                .clipShape(Circle())
                .shadow(color: .black.opacity(0.08), radius: 4, y: 2)
                .padding(10)
        }
    }

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(PazTypography.labelSmall)
            .foregroundStyle(PazColors.slateLight)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 20)
            .padding(.bottom, 8)
    }

    private func menuCard(@ViewBuilder content: () -> some View) -> some View {
        VStack(spacing: 0) { content() }
            .background(PazColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: 18))
    }

    private var rowDivider: some View {
        Divider().padding(.leading, 20)
    }

    private var loadingState: some View {
        ScrollView {
            VStack(spacing: 16) {
                SkeletonView().frame(height: 100).padding(.horizontal, 20).padding(.top, 20)
                SkeletonView().frame(height: 80).padding(.horizontal, 20)
                ForEach(0..<4, id: \.self) { _ in SkeletonView().frame(height: 52).padding(.horizontal, 20) }
                Spacer()
            }
        }
    }
}

// MARK: - Sub-views

private struct AccountRow: View {
    let title: String
    let icon: String
    let tint: Color

    var body: some View {
        HStack(spacing: 16) {
            PazIconContainer(icon: icon, tint: tint)
            Text(title).font(PazTypography.bodyMedium).foregroundStyle(PazColors.ink)
            Spacer()
            Image(systemName: "chevron.right").font(.system(size: 13)).foregroundStyle(PazColors.slateLight)
        }
        .padding(.horizontal, 16).padding(.vertical, 12)
    }
}

#Preview("Light") {
    AccountView(
        userRepository: IosAppContainer.shared.userRepository,
        authRepository: IosAppContainer.shared.authRepository
    )
    .environment(AuthenticationCoordinator(authRepository: IosAppContainer.shared.authRepository))
    .environment(AppThemeManager())
}

#Preview("Dark") {
    AccountView(
        userRepository: IosAppContainer.shared.userRepository,
        authRepository: IosAppContainer.shared.authRepository
    )
    .environment(AuthenticationCoordinator(authRepository: IosAppContainer.shared.authRepository))
    .environment(AppThemeManager())
    .preferredColorScheme(.dark)
}
