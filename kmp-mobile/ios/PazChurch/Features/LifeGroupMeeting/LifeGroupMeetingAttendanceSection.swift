import Shared
import SwiftUI

/// "Presença": roster toggles, "Todos presentes", counts and the save action.
struct LifeGroupMeetingAttendanceSection: View {
    let viewModel: LifeGroupMeetingViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: PazSpacing.md) {
            if !viewModel.entries.isEmpty {
                Text(viewModel.presenceSummary)
                    .font(PazTypography.titleSmall)
                    .foregroundStyle(PazColors.titleInk)
                MeetingSwitchRow(
                    title: "Todos presentes",
                    subtitle: allPresentSubtitle,
                    isOn: Binding(get: { viewModel.allPresent }, set: { viewModel.setAllPresent($0) }),
                    isEnabled: !viewModel.isReadOnly && !viewModel.isBusy
                )
            }
            roster
            MeetingSaveBlock(
                error: viewModel.attendanceError,
                notice: viewModel.attendanceNotice,
                buttonText: viewModel.isAttendanceSaved && !viewModel
                    .attendanceDirty ? "Presença salva" : "Salvar presença",
                isVisible: !viewModel.isReadOnly && viewModel.meeting?.attendance != nil,
                isEnabled: viewModel.canSaveAttendance,
                isLoading: viewModel.isSavingAttendance,
                action: { Task { await viewModel.saveAttendance() } }
            )
        }
    }

    private var allPresentSubtitle: String? {
        guard let attendance = viewModel.meeting?.attendance, attendance.isDraft,
              attendance.defaultPresent?.boolValue == true else {
            return nil
        }
        return "Todos começam presentes. Desmarque quem faltou."
    }

    @ViewBuilder
    private var roster: some View {
        if viewModel.meeting?.attendance == nil {
            hint("Nenhuma presença registrada para esta data.")
        } else if viewModel.entries.isEmpty {
            hint("Este grupo ainda não tem membros para lançar presença.")
        } else {
            VStack(spacing: PazSpacing.sm) {
                ForEach(viewModel.entries, id: \.userId) { entry in
                    Button(action: { viewModel.togglePresent(userId: entry.userId) }) {
                        HStack(spacing: PazSpacing.md) {
                            Image(systemName: entry.present ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(entry.present ? PazColors.accent : PazColors.slate.opacity(0.5))
                            Text(entry.name).font(PazTypography.bodyMedium).foregroundStyle(PazColors.ink)
                            Spacer()
                        }
                        .padding(PazSpacing.md)
                        .glassCard(radius: PazSpacing.cardRadiusCompact)
                    }
                    .buttonStyle(.plain)
                    .disabled(viewModel.isReadOnly || viewModel.isBusy)
                    .accessibilityElement(children: .combine)
                    .accessibilityValue(entry.present ? "Presente" : "Ausente")
                }
            }
        }
    }

    private func hint(_ text: String) -> some View {
        Text(text).font(PazTypography.bodyMedium).foregroundStyle(PazColors.slate)
    }
}
