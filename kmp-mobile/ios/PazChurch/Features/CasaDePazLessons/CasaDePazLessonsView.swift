import Shared
import SwiftUI

struct CasaDePazLessonsView: View {
    @State private var viewModel: CasaDePazLessonsListViewModel

    init(repository: CasaDePazLessonRepository = IosAppContainer.shared.casaDePazLessonRepository) {
        _viewModel = State(initialValue: CasaDePazLessonsListViewModel(repository: repository))
    }

    var body: some View {
        screenContent
            .background(PazMeshBackground())
            .navigationTitle("Conteúdo Casa de Paz")
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
        } else if viewModel.lessons.isEmpty {
            emptyState
        } else {
            contentState
        }
    }

    private var contentState: some View {
        List {
            ForEach(viewModel.lessons, id: \.week) { lesson in
                NavigationLink {
                    CasaDePazLessonDetailView(week: lesson.week)
                } label: {
                    LessonRow(lesson: lesson)
                }
                .listRowSeparator(.hidden)
                .listRowBackground(Color.clear)
            }
        }
        .listStyle(.plain)
        .refreshable { await viewModel.load() }
    }

    private var emptyState: some View {
        ContentUnavailableView(
            "Nenhum conteúdo cadastrado ainda",
            systemImage: "book.closed",
            description: Text("O conteúdo das semanas de Casa de Paz aparecerá aqui.")
        )
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
                ForEach(0..<4, id: \.self) { _ in SkeletonView().frame(height: 72).padding(.horizontal, 20) }
                Spacer()
            }
        }
    }
}

private struct LessonRow: View {
    let lesson: CasaDePazLesson

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Semana \(lesson.week)").font(PazTypography.labelSmall).foregroundStyle(PazColors.slate)
                Text(lesson.title).font(PazTypography.titleSmall).foregroundStyle(PazColors.ink).lineLimit(2)
            }
            Spacer()
            Image(systemName: "chevron.right").foregroundStyle(PazColors.slate)
        }
        .padding(12)
        .glassCard(radius: PazSpacing.cardRadiusCompact)
    }
}
