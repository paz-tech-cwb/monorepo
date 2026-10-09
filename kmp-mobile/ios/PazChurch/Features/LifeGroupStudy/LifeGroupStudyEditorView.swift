import Kingfisher
import Shared
import SwiftUI

/// Create/edit screen for "Estudo do Life" content. Reachable only from screens that
/// already gate on the current user's role (list screen "+" button, detail screen menu).
///
/// Image handling gap: the backend does not expose an arbitrary image-upload endpoint for
/// this feature — the study entity only stores a plain `image_url` string. There is no
/// device photo picker here — a picked photo cannot be resolved into a hosted URL and would
/// be persisted as a device-local URI, permanently broken for every other user/device — so
/// the only way to set the cover image is by pasting an already-hosted URL into the text
/// field below. Consistent with Android's editor.
struct LifeGroupStudyEditorView: View {
    @State private var viewModel: LifeGroupStudyEditorViewModel
    @State private var bodySelection: TextSelection?
    let onSaved: () -> Void
    let onCancel: () -> Void

    init(
        studyId: String?,
        repository: LifeGroupStudyRepository,
        onSaved: @escaping () -> Void,
        onCancel: @escaping () -> Void
    ) {
        _viewModel = State(initialValue: LifeGroupStudyEditorViewModel(studyId: studyId, repository: repository))
        self.onSaved = onSaved
        self.onCancel = onCancel
    }

    var body: some View {
        Group {
            if let loadError = viewModel.loadError {
                ErrorStateView(message: loadError) {
                    Task { await viewModel.loadIfNeeded() }
                }
            } else {
                editorForm
            }
        }
        .navigationTitle(viewModel.isEditMode ? "Editar estudo" : "Novo estudo")
        .navigationBarTitleDisplayMode(.inline)
        .pazToast(message: $viewModel.error)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancelar", action: onCancel)
            }
        }
        .task { await viewModel.loadIfNeeded() }
    }

    private var editorForm: some View {
        Form {
            Section("Título") {
                TextField("Título do estudo", text: $viewModel.title)
            }

            Section("Autor") {
                TextField("Autor", text: $viewModel.author)
            }

            Section("Imagem de capa (opcional)") {
                if !viewModel.imageUrl.isEmpty, let url = URL(string: viewModel.imageUrl) {
                    KFImage(url)
                        .resizable()
                        .placeholder { Color.clear }
                        .scaledToFill()
                        .frame(height: 140)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .clipped()
                }
                TextField("URL da imagem", text: $viewModel.imageUrl)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
            }

            Section("Conteúdo") {
                MarkdownToolbar(viewModel: viewModel, selection: $bodySelection)
                TextEditor(text: $viewModel.bodyMarkdown, selection: $bodySelection)
                    .frame(minHeight: 240)
            }

            Section {
                Button {
                    Task {
                        if let savedId = await viewModel.save() {
                            _ = savedId
                            onSaved()
                        }
                    }
                } label: {
                    if viewModel.isSaving {
                        ProgressView()
                    } else {
                        Text(viewModel.isEditMode ? "Salvar alterações" : "Publicar estudo")
                    }
                }
                .buttonStyle(.pazPillPrimary)
                .disabled(!viewModel.isValid || viewModel.isSaving)
                .listRowInsets(EdgeInsets())
                .listRowBackground(Color.clear)
            }
        }
    }
}

private struct MarkdownToolbar: View {
    let viewModel: LifeGroupStudyEditorViewModel
    @Binding var selection: TextSelection?

    var body: some View {
        HStack(spacing: 16) {
            Button { viewModel.applyMarkdownWrap("**", selection: selection) } label: {
                Image(systemName: "bold")
            }
            Button { viewModel.applyMarkdownWrap("_", selection: selection) } label: {
                Image(systemName: "italic")
            }
            Button { viewModel.applyMarkdownLinePrefix("## ") } label: {
                Image(systemName: "textformat.size")
            }
            Button { viewModel.applyMarkdownLinePrefix("- ") } label: {
                Image(systemName: "list.bullet")
            }
        }
        .buttonStyle(.borderless)
        .foregroundStyle(PazColors.accent)
    }
}
