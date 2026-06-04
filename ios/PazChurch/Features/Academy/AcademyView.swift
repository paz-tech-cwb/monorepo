import Shared
import SwiftUI

struct AcademyView: View {
    @State private var viewModel: AcademyViewModel
    @Environment(AuthenticationCoordinator.self) private var authCoordinator
    @State private var showLoginSheet = false

    init(academyRepository: AcademyRepository) {
        _viewModel = State(initialValue: AcademyViewModel(academyRepository: academyRepository))
    }

    var body: some View {
        NavigationStack {
            ZStack {
                PazColors.background.ignoresSafeArea()
                if viewModel.isLoading {
                    loadingState
                } else if viewModel.error != nil {
                    errorState
                } else if viewModel.tracks.isEmpty {
                    emptyState
                } else {
                    contentState
                }
            }
            .navigationTitle("Academia")
        }
        .sheet(isPresented: $showLoginSheet) {
            LoginView(
                authCoordinator: authCoordinator,
                onDismiss: { showLoginSheet = false }
            )
        }
        .onChange(of: authCoordinator.isAuthenticated) { _, isAuthenticated in
            if isAuthenticated { showLoginSheet = false }
        }
    }

    private var contentState: some View {
        ScrollView {
            VStack(spacing: PazSpacing.lg) {
                // Hero header
                VStack(alignment: .leading, spacing: PazSpacing.sm) {
                    Text("Aprenda com a Paz")
                        .font(PazTypography.headlineSmall)
                        .foregroundStyle(.white)
                    Text("Conteúdo educacional exclusivo")
                        .font(PazTypography.bodySmall)
                        .foregroundStyle(.white.opacity(0.8))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(PazSpacing.lg)
                .background(PazColors.heroGradient)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .padding(.horizontal, PazSpacing.lg)
                .padding(.top, PazSpacing.lg)

                // Tracks with courses
                ForEach(viewModel.tracks, id: \.id) { track in
                    TrackSection(track: track, onCourseTap: { course in
                        if authCoordinator.isAuthenticated {
                            viewModel.onCourseTapped(course)
                        } else {
                            showLoginSheet = true
                        }
                    })
                }

                Spacer().frame(height: PazSpacing.xl)
            }
            .background(PazColors.background)
        }
    }

    private var emptyState: some View {
        VStack(spacing: PazSpacing.md) {
            Spacer()
            Text("Nenhum conteúdo disponível")
                .font(PazTypography.bodyMedium)
                .foregroundStyle(.secondary)
            Spacer()
        }
    }

    private var loadingState: some View {
        ScrollView {
            VStack(spacing: PazSpacing.lg) {
                SkeletonView().frame(height: 100).padding(.horizontal, PazSpacing.lg).padding(.top, PazSpacing.lg)
                ForEach(0..<4, id: \.self) { _ in
                    SkeletonView().frame(height: 80).padding(.horizontal, PazSpacing.lg)
                }
                Spacer()
            }
        }
    }

    private var errorState: some View {
        VStack(spacing: PazSpacing.lg) {
            Spacer()
            VStack(spacing: PazSpacing.md) {
                Image(systemName: "exclamationmark.circle")
                    .font(.system(size: 48))
                    .foregroundStyle(PazColors.error)
                Text("Erro ao carregar")
                    .font(PazTypography.titleMedium)
                Text(viewModel.error ?? "Algo deu errado")
                    .font(PazTypography.bodySmall)
                    .foregroundStyle(.secondary)
                Spacer().frame(height: PazSpacing.md)
                Button(action: { viewModel.onRetry() }) {
                    Text("Tentar Novamente")
                        .font(PazTypography.titleMedium)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, PazSpacing.md)
                        .background(PazColors.primary)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
            .padding(PazSpacing.lg)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(PazColors.background)
    }
}

private struct TrackSection: View {
    let track: CourseTrack
    let onCourseTap: (Course) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: PazSpacing.sm) {
            Text(track.title)
                .font(PazTypography.titleMedium)
                .padding(.horizontal, PazSpacing.lg)

            if let desc = track.description_, !desc.isEmpty {
                Text(desc)
                    .font(PazTypography.bodySmall)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, PazSpacing.lg)
            }

            ForEach(track.courses, id: \.id) { course in
                Button { onCourseTap(course) } label: {
                    CourseCard(course: course)
                }
                .buttonStyle(.plain)
                .padding(.horizontal, PazSpacing.lg)
            }
        }
    }
}

private struct CourseCard: View {
    let course: Course

    var body: some View {
        HStack(spacing: PazSpacing.md) {
            ZStack {
                Color.blue.opacity(0.15)
                if let url = course.thumbnailUrl, !url.isEmpty {
                    AsyncImage(url: URL(string: url)) { image in
                        image.resizable().scaledToFill()
                    } placeholder: {
                        Color.blue.opacity(0.15)
                    }
                    .clipped()
                } else {
                    Text(String(course.title.prefix(1)))
                        .font(PazTypography.titleMedium)
                        .foregroundStyle(PazColors.primary)
                }
            }
            .frame(width: 80, height: 60)
            .clipShape(RoundedRectangle(cornerRadius: 10))

            VStack(alignment: .leading, spacing: PazSpacing.xs) {
                Text(course.title)
                    .font(PazTypography.titleSmall)
                    .lineLimit(2)
                    .foregroundStyle(PazColors.onSurface)

                if let desc = course.description_, !desc.isEmpty {
                    Text(desc)
                        .font(PazTypography.labelSmall)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            }
            Spacer()
        }
        .padding(PazSpacing.md)
        .background(PazColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

#Preview {
    AcademyView(academyRepository: IosAppContainer.shared.academyRepository)
}
