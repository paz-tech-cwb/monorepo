import Shared
import SwiftUI

struct CasaDePazLessonDetailView: View {
    @State private var viewModel: CasaDePazLessonDetailViewModel

    init(week: Int32, repository: CasaDePazLessonRepository = IosAppContainer.shared.casaDePazLessonRepository) {
        _viewModel = State(initialValue: CasaDePazLessonDetailViewModel(week: week, repository: repository))
    }

    var body: some View {
        screenContent
            .background(PazMeshBackground())
            .navigationTitle(viewModel.lesson.map { "Semana \($0.week)" } ?? "Casa de Paz")
            .navigationBarTitleDisplayMode(.large)
            .toolbarBackground(.hidden, for: .navigationBar)
            .task { await viewModel.load() }
    }

    @ViewBuilder
    private var screenContent: some View {
        if viewModel.isLoading {
            loadingState
        } else if let error = viewModel.error {
            errorState(message: error)
        } else if let lesson = viewModel.lesson {
            contentState(lesson: lesson)
        } else {
            errorState(message: "Semana não encontrada.")
        }
    }

    private func contentState(lesson: CasaDePazLesson) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: PazSpacing.lg) {
                Text(lesson.title).font(PazTypography.headlineSmall)

                if let urlString = lesson.youtubeUrl, !urlString.isEmpty {
                    if let videoId = lesson.youtubeVideoId {
                        YouTubePlayerView(youtubeId: videoId)
                            .aspectRatio(16 / 9, contentMode: .fit)
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                    } else if let url = URL(string: urlString) {
                        Link(destination: url) {
                            Label("Abrir no YouTube", systemImage: "arrow.up.right.square")
                        }
                        .buttonStyle(.pazPillPrimary)
                    }
                }

                if !lesson.summary.isEmpty {
                    MarkdownBodyView(markdown: lesson.summary)
                }

                if !lesson.guidelines.isEmpty {
                    MarkdownBodyView(markdown: lesson.guidelines)
                }

                if !lesson.questions.isEmpty {
                    VStack(alignment: .leading, spacing: PazSpacing.sm) {
                        Text("Perguntas").font(PazTypography.titleMedium)
                        ForEach(Array(lesson.questions.enumerated()), id: \.offset) { index, question in
                            Text("\(index + 1). \(question)").font(PazTypography.bodyMedium)
                        }
                    }
                }

                Spacer().frame(height: PazSpacing.xl)
            }
            .padding(.horizontal, PazSpacing.lg)
            .padding(.top, PazSpacing.lg)
        }
    }

    private func errorState(message: String) -> some View {
        VStack(spacing: 16) {
            Spacer()
            Text(message).font(PazTypography.bodySmall).foregroundStyle(PazColors.slate).multilineTextAlignment(.center)
            Button("Tentar Novamente") {
                Task { await viewModel.load() }
            }
            .font(PazTypography.titleSmall)
            .foregroundStyle(PazColors.accent)
            Spacer()
        }
        .padding(.horizontal, 24)
    }

    private var loadingState: some View {
        ScrollView {
            VStack(spacing: 16) {
                Spacer().frame(height: 20)
                SkeletonView().frame(height: 180).padding(.horizontal, 20)
                SkeletonView().frame(height: 28).padding(.horizontal, 20)
                SkeletonView().frame(height: 200).padding(.horizontal, 20)
                Spacer()
            }
        }
    }
}
