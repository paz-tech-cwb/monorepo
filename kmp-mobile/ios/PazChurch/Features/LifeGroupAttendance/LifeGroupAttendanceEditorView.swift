import Shared
import SwiftUI

struct LifeGroupAttendanceEditorView: View {
    @State private var viewModel: LifeGroupAttendanceEditorViewModel
    var onSaved: () -> Void
    var onCancel: () -> Void

    @Environment(\.dismiss) private var dismiss

    init(
        lifeGroupId: Int32,
        meetingDate: String,
        repository: LifeGroupAttendanceRepository,
        onSaved: @escaping () -> Void,
        onCancel: @escaping () -> Void
    ) {
        _viewModel = State(
            initialValue: LifeGroupAttendanceEditorViewModel(
                lifeGroupId: lifeGroupId, meetingDate: meetingDate, repository: repository
            )
        )
        self.onSaved = onSaved
        self.onCancel = onCancel
    }

    var body: some View {
        screenContent
            .background(PazMeshBackground())
            .navigationTitle(viewModel.meetingDate)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") {
                        onCancel()
                        dismiss()
                    }
                }
            }
            .task { await viewModel.load() }
    }

    @ViewBuilder
    private var screenContent: some View {
        if viewModel.isLoading {
            loadingState
        } else if let error = viewModel.error {
            errorState(message: error)
        } else if viewModel.entries.isEmpty {
            emptyState
        } else {
            contentState
        }
    }

    private var contentState: some View {
        VStack(spacing: 0) {
            List {
                Section {
                    Text("\(viewModel.entries.filter(\.present).count) de \(viewModel.entries.count) presentes")
                        .font(PazTypography.titleSmall)
                        .foregroundStyle(PazColors.accent)
                }
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)

                ForEach(viewModel.entries, id: \.userId) { entry in
                    Button(action: { viewModel.togglePresent(userId: entry.userId) }) {
                        HStack {
                            Image(systemName: entry.present ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(entry.present ? PazColors.accent : PazColors.slate.opacity(0.5))
                            Text(entry.name).foregroundStyle(PazColors.ink)
                            Spacer()
                        }
                    }
                    .listRowSeparator(.hidden)
                    .listRowBackground(Color.clear)
                }
            }
            .listStyle(.plain)

            VStack(spacing: 8) {
                if let saveError = viewModel.saveError {
                    Text(saveError).font(PazTypography.bodySmall).foregroundColor(.red)
                }
                Button(action: { Task { await saveAndDismiss() } }) {
                    Text(viewModel.isSaving ? "Salvando..." : "Salvar presença")
                        .font(PazTypography.titleSmall)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(PazColors.accent)
                        .foregroundColor(.white)
                        .cornerRadius(14)
                }
                .disabled(viewModel.isSaving)
            }
            .padding(16)
        }
    }

    private var emptyState: some View {
        ContentUnavailableView(
            "Nenhum membro para lançar presença",
            systemImage: "person.slash"
        )
    }

    private func errorState(message: String) -> some View {
        VStack(spacing: 16) {
            Spacer()
            Text(message).font(PazTypography.bodySmall).foregroundStyle(PazColors.slate).multilineTextAlignment(.center)
            Button("Tentar Novamente") { Task { await viewModel.load() } }
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
                ForEach(0..<6, id: \.self) { _ in SkeletonView().frame(height: 44).padding(.horizontal, 20) }
                Spacer()
            }
        }
    }

    private func saveAndDismiss() async {
        let ok = await viewModel.save()
        if ok {
            onSaved()
            dismiss()
        }
    }
}
