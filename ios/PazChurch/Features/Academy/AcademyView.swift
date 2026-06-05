import Shared
import SwiftUI

struct AcademyView: View {
    @State private var viewModel: AcademyViewModel
    @Environment(AuthenticationCoordinator.self) private var authCoordinator
    @State private var showLoginSheet = false
    @State private var selectedTrackIndex = 0

    init(academyRepository: AcademyRepository) {
        _viewModel = State(initialValue: AcademyViewModel(academyRepository: academyRepository))
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                PazColors.background.ignoresSafeArea()
                VStack(spacing: 0) {
                    heroHeader
                    ZStack {
                        PazColors.background
                            .clipShape(RoundedRectangle(cornerRadius: 28))
                            .ignoresSafeArea(edges: .bottom)
                        screenContent
                    }
                }
            }
            .navigationBarHidden(true)
        }
        .sheet(isPresented: $showLoginSheet) {
            LoginView(authCoordinator: authCoordinator, onDismiss: { showLoginSheet = false })
        }
        .task { await viewModel.load(isAuthenticated: authCoordinator.isAuthenticated) }
        .onChange(of: authCoordinator.isAuthenticated) { _, isAuth in
            Task { await viewModel.load(isAuthenticated: isAuth) }
        }
    }

    // MARK: - States

    @ViewBuilder
    private var screenContent: some View {
        if viewModel.isLoading {
            loadingState
        } else if let error = viewModel.error {
            errorState(message: error)
        } else if !authCoordinator.isAuthenticated, viewModel.tracks.isEmpty {
            loggedOutPromo
        } else if viewModel.tracks.isEmpty {
            emptyState
        } else {
            contentState
        }
    }

    private var heroHeader: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Conteúdo exclusivo")
                .font(PazTypography.bodySmall)
                .foregroundStyle(.white.opacity(0.5))
            Text("Academia\nPaz Church")
                .font(PazTypography.headlineMedium)
                .foregroundStyle(.white)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 24)
        .padding(.top, 16)
        .padding(.bottom, 24)
        .background(PazColors.heroGradient)
    }

    private var contentState: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                if authCoordinator.isAuthenticated, let resume = viewModel.resumeCourse {
                    ResumeBanner(course: resume)
                        .padding(.horizontal, 20)
                        .padding(.top, 20)
                        .padding(.bottom, 12)
                }

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(viewModel.tracks.indices, id: \.self) { i in
                            PazPillChip(
                                label: viewModel.tracks[i].title,
                                selected: selectedTrackIndex == i,
                                onTap: { selectedTrackIndex = i }
                            )
                        }
                    }
                    .padding(.horizontal, 20)
                }
                .padding(.top, viewModel.resumeCourse == nil ? 20 : 0)
                .padding(.bottom, 12)

                let track = viewModel.tracks[safe: selectedTrackIndex] ?? viewModel.tracks[0]

                if let desc = track.description_, !desc.isEmpty {
                    Text(desc)
                        .font(PazTypography.bodySmall)
                        .foregroundStyle(PazColors.slate)
                        .padding(.horizontal, 20)
                        .padding(.bottom, 12)
                }

                ForEach(Array(track.courses.enumerated()), id: \.element.id) { index, course in
                    CourseCard(course: course) {
                        if authCoordinator.isAuthenticated { viewModel.onCourseTapped(course) }
                        else { showLoginSheet = true }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 12)
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
                    .animation(
                        .spring(response: 0.6, dampingFraction: 0.8).delay(Double(index) * 0.065),
                        value: selectedTrackIndex
                    )
                }

                Spacer().frame(height: 32)
            }
        }
    }

    private var loggedOutPromo: some View {
        ScrollView {
            VStack(spacing: 16) {
                Spacer().frame(height: 20)
                VStack(spacing: 16) {
                    ZStack {
                        Circle().fill(PazColors.pazPrimary.opacity(0.1)).frame(width: 64, height: 64)
                        Image(systemName: "lock.fill").font(.system(size: 26)).foregroundStyle(PazColors.pazPrimary)
                    }
                    Text("Conteúdo exclusivo").font(PazTypography.titleMedium)
                    Text("Faça login para acessar todos os cursos da Academia Paz Church")
                        .font(PazTypography.bodySmall)
                        .foregroundStyle(PazColors.slate)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(24)
                .background(PazColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: 18))
                .padding(.horizontal, 20)

                VStack(alignment: .leading, spacing: 12) {
                    Text("O que você encontra").font(PazTypography.titleMedium).foregroundStyle(.white)
                    ForEach(
                        [
                            ("graduationcap.fill", "Cursos de discipulado"),
                            ("play.rectangle.fill", "Videoaulas exclusivas"),
                            ("star.fill", "Trilhas de aprendizado"),
                        ],
                        id: \.0
                    ) { icon, label in
                        HStack(spacing: 8) {
                            Image(systemName: icon).foregroundStyle(PazColors.pazGold).font(.system(size: 15))
                            Text(label).font(PazTypography.bodySmall).foregroundStyle(.white.opacity(0.9))
                        }
                    }
                    Button { showLoginSheet = true } label: {
                        Text("Entrar na minha conta")
                            .font(PazTypography.titleSmall)
                            .foregroundStyle(PazColors.pazPrimary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .padding(.top, 4)
                }
                .padding(24)
                .background(PazColors.featuredCardGradient)
                .clipShape(RoundedRectangle(cornerRadius: 18))
                .padding(.horizontal, 20)

                Spacer().frame(height: 32)
            }
        }
    }

    private var emptyState: some View {
        VStack {
            Spacer()
            Text("Nenhum conteúdo disponível").font(PazTypography.bodyMedium).foregroundStyle(PazColors.slate)
            Spacer()
        }
    }

    private func errorState(message: String) -> some View {
        VStack(spacing: 16) {
            Spacer()
            Text(message).font(PazTypography.bodySmall).foregroundStyle(PazColors.slate).multilineTextAlignment(.center)
            Button("Tentar Novamente") {
                viewModel.onRetry(isAuthenticated: authCoordinator.isAuthenticated)
            }
            .font(PazTypography.titleSmall)
            .foregroundStyle(PazColors.pazPrimary)
            Spacer()
        }
        .padding(.horizontal, 24)
    }

    private var loadingState: some View {
        ScrollView {
            VStack(spacing: 16) {
                Spacer().frame(height: 20)
                SkeletonView().frame(height: 38).padding(.horizontal, 20)
                ForEach(0..<4, id: \.self) { _ in SkeletonView().frame(height: 80).padding(.horizontal, 20) }
                Spacer()
            }
        }
    }
}

// MARK: - Sub-views

private struct ResumeBanner: View {
    let course: Course

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                PazColors.featuredCardGradient
                Image(systemName: "play.fill").font(.system(size: 18)).foregroundStyle(.white)
            }
            .frame(width: 72, height: 48)
            .clipShape(RoundedRectangle(cornerRadius: 10))

            VStack(alignment: .leading, spacing: 2) {
                Text("Continuar assistindo").font(PazTypography.labelSmall).foregroundStyle(PazColors.pazSky)
                Text(course.title).font(PazTypography.titleSmall).foregroundStyle(PazColors.ink).lineLimit(1)
            }
            Spacer()
            PazGoldBadge(text: "Retomar")
        }
        .padding(12)
        .background(PazColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }
}

private struct CourseCard: View {
    let course: Course
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                ZStack {
                    PazColors.featuredCardGradient
                    if let url = course.thumbnailUrl, !url.isEmpty {
                        AsyncImage(url: URL(string: url)) { img in
                            img.resizable().scaledToFill()
                        } placeholder: {
                            Color.clear
                        }
                        .clipped()
                    } else {
                        Image(systemName: "play.rectangle.fill")
                            .font(.system(size: 22))
                            .foregroundStyle(.white.opacity(0.7))
                    }
                    Circle().fill(.white.opacity(0.22)).frame(width: 28, height: 28)
                        .overlay(Image(systemName: "play.fill").font(.system(size: 10)).foregroundStyle(.white))
                }
                .frame(width: 104, height: 68)
                .clipShape(RoundedRectangle(cornerRadius: 10))

                VStack(alignment: .leading, spacing: 4) {
                    Text(course.title).font(PazTypography.titleSmall).foregroundStyle(PazColors.ink).lineLimit(2)
                    if let desc = course.description_, !desc.isEmpty {
                        Text(desc).font(PazTypography.bodySmall).foregroundStyle(PazColors.slate).lineLimit(1)
                    }
                }
                Spacer()
            }
            .padding(12)
            .background(PazColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: 18))
        }
        .buttonStyle(.plain)
    }
}

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}

#Preview("Logged In — Light") {
    AcademyView(academyRepository: IosAppContainer.shared.academyRepository)
        .environment(AuthenticationCoordinator(authRepository: IosAppContainer.shared.authRepository))
}

#Preview("Logged In — Dark") {
    AcademyView(academyRepository: IosAppContainer.shared.academyRepository)
        .environment(AuthenticationCoordinator(authRepository: IosAppContainer.shared.authRepository))
        .preferredColorScheme(.dark)
}
