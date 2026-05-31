import SwiftUI
import Shared

struct AcademyView: View {
    @StateObject private var viewModel: AcademyViewModel

    init(academyRepository: AcademyRepository) {
        _viewModel = StateObject(wrappedValue: AcademyViewModel(academyRepository: academyRepository))
    }

    var body: some View {
        NavigationStack {
            ZStack {
                if viewModel.isLoading {
                    loadingState
                } else if viewModel.error != nil {
                    errorState
                } else {
                    contentState
                }
            }
            .navigationTitle("Academia")
        }
    }

    @ViewBuilder
    private var contentState: some View {
        ScrollView {
            VStack(spacing: PazSpacing.lg) {
                // Hero header
                VStack(alignment: .leading, spacing: PazSpacing.sm) {
                    Text("Aprenda com a Paz")
                        .font(PazTypography.headlineSmall)
                        .foregroundColor(.white)
                    Text("Conteúdo educacional exclusivo")
                        .font(PazTypography.bodySmall)
                        .foregroundColor(.white.opacity(0.8))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(PazSpacing.lg)
                .background(PazColors.heroGradient)
                .cornerRadius(16)
                .padding(.horizontal, PazSpacing.lg)
                .padding(.top, PazSpacing.lg)

                // Featured video
                if let featured = viewModel.academyContent?.videos.first {
                    FeaturedVideoCard(video: featured)
                        .padding(.horizontal, PazSpacing.lg)
                }

                // Category filter
                if !viewModel.categories.isEmpty {
                    VStack(alignment: .leading, spacing: PazSpacing.md) {
                        Text("Categorias")
                            .font(PazTypography.labelMedium)
                            .padding(.horizontal, PazSpacing.lg)

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: PazSpacing.sm) {
                                ForEach(viewModel.categories, id: \.self) { category in
                                    Button(action: {
                                        viewModel.selectedCategory = viewModel.selectedCategory == category ? nil : category
                                    }) {
                                        Text(category)
                                            .font(PazTypography.labelSmall)
                                            .padding(.horizontal, PazSpacing.md)
                                            .padding(.vertical, PazSpacing.sm)
                                            .background(viewModel.selectedCategory == category ? PazColors.primary : PazColors.surface)
                                            .foregroundColor(viewModel.selectedCategory == category ? .white : PazColors.onSurface)
                                            .cornerRadius(20)
                                    }
                                }
                            }
                            .padding(.horizontal, PazSpacing.lg)
                        }
                    }
                }

                // Video list
                VStack(spacing: PazSpacing.md) {
                    ForEach(viewModel.filteredVideos, id: \.id) { video in
                        VideoCard(video: video)
                    }
                }
                .padding(.horizontal, PazSpacing.lg)

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
                SkeletonView().frame(height: 200).padding(.horizontal, PazSpacing.lg)
                ForEach(0..<3, id: \.self) { _ in
                    SkeletonView().frame(height: 100).padding(.horizontal, PazSpacing.lg)
                }
                Spacer()
            }
        }
    }

    @ViewBuilder
    private var errorState: some View {
        VStack(spacing: PazSpacing.lg) {
            Spacer()
            VStack(spacing: PazSpacing.md) {
                Image(systemName: "exclamationmark.circle")
                    .font(.system(size: 48))
                    .foregroundColor(PazColors.error)
                Text("Erro ao carregar")
                    .font(PazTypography.titleMedium)
                Text(viewModel.error ?? "Algo deu errado")
                    .font(PazTypography.bodySmall)
                    .foregroundColor(.gray)
                Spacer().frame(height: PazSpacing.md)
                Button(action: { viewModel.onRetry() }) {
                    Text("Tentar Novamente")
                        .font(PazTypography.titleMedium)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, PazSpacing.md)
                        .background(PazColors.primary)
                        .cornerRadius(12)
                }
            }
            .padding(PazSpacing.lg)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(PazColors.background)
    }
}

private struct FeaturedVideoCard: View {
    let video: AcademyContent.Video

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            Color.blue.opacity(0.2)

            VStack(alignment: .leading) {
                Text(video.title)
                    .font(PazTypography.titleSmall)
                    .foregroundColor(.white)
                Spacer()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .padding(PazSpacing.lg)

            VStack(spacing: PazSpacing.sm) {
                Image(systemName: "play.circle.fill")
                    .font(.system(size: 32))
                    .foregroundColor(.white)
                Text("\(video.duration)min")
                    .font(PazTypography.labelSmall)
                    .foregroundColor(.white)
            }
            .padding(PazSpacing.lg)
        }
        .frame(height: 180)
        .cornerRadius(16)
    }
}

private struct VideoCard: View {
    let video: AcademyContent.Video

    var body: some View {
        HStack(spacing: PazSpacing.md) {
            ZStack {
                Color.blue.opacity(0.15)
                Image(systemName: "play.circle.fill")
                    .font(.system(size: 24))
                    .foregroundColor(PazColors.primary)
            }
            .frame(width: 80, height: 80)
            .cornerRadius(12)

            VStack(alignment: .leading, spacing: PazSpacing.xs) {
                Text(video.title)
                    .font(PazTypography.titleSmall)
                    .lineLimit(2)

                Text(video.category)
                    .font(PazTypography.labelSmall)
                    .foregroundColor(.gray)

                HStack(spacing: PazSpacing.sm) {
                    Image(systemName: "clock")
                        .font(.system(size: 12))
                    Text("\(video.duration) min")
                        .font(PazTypography.labelSmall)
                }
                .foregroundColor(.gray)
            }
            Spacer()
        }
        .padding(PazSpacing.md)
        .background(PazColors.surface)
        .cornerRadius(12)
    }
}

#Preview {
    AcademyView(academyRepository: AcademyRepositoryImpl())
}
