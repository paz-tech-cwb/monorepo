import Shared
import SwiftUI

struct LifeGroupAttendanceHistoryView: View {
    let lifeGroupId: Int32
    @State private var viewModel: LifeGroupAttendanceHistoryViewModel
    @State private var showEditorForDate: EditorDate?

    private struct EditorDate: Identifiable {
        let date: String
        var id: String { date }
    }

    init(lifeGroupId: Int32, repository: LifeGroupAttendanceRepository) {
        self.lifeGroupId = lifeGroupId
        _viewModel = State(initialValue: LifeGroupAttendanceHistoryViewModel(lifeGroupId: lifeGroupId, repository: repository))
    }

    private var todayKey: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }

    var body: some View {
        screenContent
            .background(PazMeshBackground())
            .navigationTitle("Presença")
            .navigationBarTitleDisplayMode(.large)
            .toolbarBackground(.hidden, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button(action: { showEditorForDate = EditorDate(date: todayKey) }) {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(item: $showEditorForDate) { editorDate in
                NavigationStack {
                    LifeGroupAttendanceEditorView(
                        lifeGroupId: lifeGroupId,
                        meetingDate: editorDate.date,
                        repository: IosAppContainer.shared.lifeGroupAttendanceRepository,
                        onSaved: {
                            showEditorForDate = nil
                            Task { await viewModel.load() }
                        },
                        onCancel: { showEditorForDate = nil }
                    )
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
        } else if viewModel.records.isEmpty {
            emptyState
        } else {
            contentState
        }
    }

    private var contentState: some View {
        List {
            ForEach(viewModel.records, id: \.meetingDate) { record in
                Button(action: { showEditorForDate = EditorDate(date: record.meetingDate) }) {
                    AttendanceRow(record: record)
                }
                .listRowSeparator(.hidden)
                .listRowBackground(Color.clear)
            }
        }
        .listStyle(.plain)
    }

    private var emptyState: some View {
        ContentUnavailableView(
            "Nenhuma presença lançada ainda",
            systemImage: "checklist",
            description: Text("Toque em + para lançar a presença da próxima reunião.")
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
                ForEach(0..<5, id: \.self) { _ in SkeletonView().frame(height: 64).padding(.horizontal, 20) }
                Spacer()
            }
        }
    }
}

private struct AttendanceRow: View {
    let record: LifeGroupAttendance

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "person.3.fill")
                .foregroundStyle(PazColors.accent)
            VStack(alignment: .leading, spacing: 4) {
                Text(record.meetingDate).font(PazTypography.titleSmall).foregroundStyle(PazColors.ink)
                Text("\(record.presentCount) de \(record.membersCount) presentes")
                    .font(PazTypography.bodySmall)
                    .foregroundStyle(PazColors.slate)
            }
            Spacer()
        }
        .padding(16)
        .glassCard(radius: PazSpacing.cardRadiusCompact)
    }
}
