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
            .background(PazColors.background)
            .navigationTitle(viewModel.study?.title ?? "Estudo do Life")
            .navigationBarTitleDisplayMode(.large)
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
            .foregroundStyle(PazColors.pazPrimary)
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

/// Minimal Markdown renderer for study body content. Uses `AttributedString(markdown:)`
/// (available on this project's iOS 19.4 deployment target) per-line so headings and
/// simple lists still read sensibly even though `AttributedString` markdown parsing does
/// not natively distinguish block-level heading sizes.
struct MarkdownBodyView: View {
    let markdown: String

    var body: some View {
        VStack(alignment: .leading, spacing: PazSpacing.sm) {
            ForEach(Array(lines.enumerated()), id: \.offset) { _, line in
                lineView(for: line)
            }
        }
    }

    private var lines: [String] {
        markdown.components(separatedBy: "\n").filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
    }

    @ViewBuilder
    private func lineView(for rawLine: String) -> some View {
        let line = rawLine.trimmingCharacters(in: .whitespaces)
        if line.hasPrefix("### ") {
            attributedText(String(line.dropFirst(4))).font(PazTypography.titleMedium)
        } else if line.hasPrefix("## ") {
            attributedText(String(line.dropFirst(3))).font(PazTypography.titleLarge)
        } else if line.hasPrefix("# ") {
            attributedText(String(line.dropFirst(2))).font(PazTypography.headlineSmall)
        } else if line.hasPrefix("- ") || line.hasPrefix("* ") {
            HStack(alignment: .top, spacing: 6) {
                Text("•").font(PazTypography.bodyMedium)
                attributedText(String(line.dropFirst(2))).font(PazTypography.bodyMedium)
            }
        } else {
            attributedText(line).font(PazTypography.bodyMedium)
        }
    }

    private func attributedText(_ text: String) -> Text {
        if let attributed = try? AttributedString(markdown: text) {
            return Text(attributed)
        }
        return Text(text)
    }
}
