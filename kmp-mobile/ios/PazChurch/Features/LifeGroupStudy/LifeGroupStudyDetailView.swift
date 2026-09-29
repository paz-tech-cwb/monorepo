import Kingfisher
import Shared
import SwiftUI

struct LifeGroupStudyDetailView: View {
    @State private var viewModel: LifeGroupStudyDetailViewModel
    @Environment(AuthenticationCoordinator.self) private var authCoordinator
    @Environment(\.dismiss) private var dismiss
    @State private var showEditor = false
    @State private var showDeleteConfirm = false

    private let studyId: String
    private let repository: LifeGroupStudyRepository

    init(studyId: String, repository: LifeGroupStudyRepository) {
        self.studyId = studyId
        self.repository = repository
        _viewModel = State(initialValue: LifeGroupStudyDetailViewModel(studyId: studyId, repository: repository))
    }

    var body: some View {
        screenContent
            .background(PazMeshBackground())
            .navigationTitle(viewModel.study?.title ?? "Estudo do Life")
            .navigationBarTitleDisplayMode(.large)
            .toolbarBackground(.hidden, for: .navigationBar)
            .toolbar {
                if viewModel.canEdit {
                    ToolbarItem(placement: .primaryAction) {
                        Menu {
                            Button("Editar", systemImage: "pencil") { showEditor = true }
                            Button("Excluir", systemImage: "trash", role: .destructive) { showDeleteConfirm = true }
                        } label: {
                            Image(systemName: "ellipsis.circle")
                        }
                    }
                }
            }
            .confirmationDialog(
                "Excluir estudo",
                isPresented: $showDeleteConfirm,
                titleVisibility: .visible
            ) {
                Button("Excluir", role: .destructive) {
                    Task {
                        if await viewModel.delete() { dismiss() }
                    }
                }
                Button("Cancelar", role: .cancel) {}
            } message: {
                Text("Tem certeza que deseja excluir este estudo? Essa ação não pode ser desfeita.")
            }
            .sheet(isPresented: $showEditor) {
                NavigationStack {
                    LifeGroupStudyEditorView(
                        studyId: studyId,
                        repository: repository,
                        onSaved: {
                            showEditor = false
                            Task { await viewModel.load(currentUser: authCoordinator.currentUser) }
                        },
                        onCancel: { showEditor = false }
                    )
                }
            }
            .task { await viewModel.load(currentUser: authCoordinator.currentUser) }
    }

    @ViewBuilder
    private var screenContent: some View {
        if viewModel.isLoading {
            loadingState
        } else if let error = viewModel.error {
            errorState(message: error)
        } else if let study = viewModel.study {
            contentState(study: study)
        } else {
            errorState(message: "Algo deu errado. Tente novamente.")
        }
    }

    private func contentState(study: LifeGroupStudy) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: PazSpacing.lg) {
                if let urlStr = study.imageUrl, !urlStr.isEmpty, let url = URL(string: urlStr) {
                    KFImage(url)
                        .resizable()
                        .placeholder { PazColors.featuredCardGradient }
                        .fade(duration: 0.2)
                        .scaledToFill()
                        .frame(height: 180)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .clipped()
                }

                VStack(alignment: .leading, spacing: PazSpacing.xs) {
                    Text(study.title).font(PazTypography.headlineSmall)
                    Text("Por \(study.author)").font(PazTypography.bodySmall).foregroundStyle(PazColors.slate)
                }

                MarkdownBodyView(markdown: study.bodyMarkdown)

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
                Task { await viewModel.load(currentUser: authCoordinator.currentUser) }
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
