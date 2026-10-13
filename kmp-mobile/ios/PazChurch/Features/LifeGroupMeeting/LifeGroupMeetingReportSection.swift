import Shared
import SwiftUI

/// "Relatório": derived counts (read-only) plus the 13 report inputs; locked until the presence is saved.
struct LifeGroupMeetingReportSection: View {
    let viewModel: LifeGroupMeetingViewModel

    private var isEnabled: Bool {
        viewModel.canEditReport && !viewModel.isBusy
    }

    var body: some View {
        VStack(alignment: .leading, spacing: PazSpacing.md) {
            if let locked = viewModel.reportLockedMessage {
                MeetingNoticeCard(text: locked, isWarning: viewModel.reportBlockedReason != nil)
            }
            if viewModel.isReadOnly, !viewModel.isReportSaved {
                Text("Nenhum relatório foi enviado para esta reunião.")
                    .font(PazTypography.bodyMedium)
                    .foregroundStyle(PazColors.slate)
            } else {
                derivedCard
                countFields
                leaderAttendedFields
                activityFields
                MeetingSaveBlock(
                    error: viewModel.reportError,
                    notice: viewModel.reportNotice,
                    buttonText: viewModel.isReportSaved && !viewModel
                        .reportDirty ? "Relatório salvo" : "Salvar relatório",
                    isVisible: !viewModel.isReadOnly && viewModel.reportBlockedReason == nil,
                    isEnabled: viewModel.canSaveReport,
                    isLoading: viewModel.isSavingReport,
                    action: { Task { await viewModel.saveReport() } }
                )
            }
        }
    }

    /// "Comprometidos"/"Presentes" are derived from the attendance, never typed.
    private var derivedCard: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Comprometidos: \(viewModel.committedMembers)").font(PazTypography.titleSmall)
                .foregroundStyle(PazColors.ink)
            Text("Presentes: \(viewModel.committedMembersPresent)").font(PazTypography.titleSmall)
                .foregroundStyle(PazColors.ink)
            Text(
                viewModel.attendanceDirty
                    ? "Calculado da presença. Será atualizado quando você salvar a presença."
                    : "Calculado da presença; não é preenchido à mão."
            )
            .font(PazTypography.bodySmall)
            .foregroundStyle(PazColors.slate)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(PazSpacing.lg)
        .glassCard(radius: PazSpacing.cardRadiusCompact)
    }

    private var countFields: some View {
        VStack(alignment: .leading, spacing: PazSpacing.md) {
            field("Crianças (0 a 11 anos)", .kids0To11, .numberPad, "0")
            field("Convidados", .guests, .numberPad, "0")
            field("MDAs", .mdas, .numberPad, "0")
            field("Oferta (R$)", .offering, .decimalPad, "0,00")
            field("Comprometidos no Tadel", .committedAtTadel, .numberPad, "0")
            field("Comprometidos no culto", .committedAtCulto, .numberPad, "0")
        }
    }

    private var leaderAttendedFields: some View {
        VStack(alignment: .leading, spacing: PazSpacing.md) {
            Text("Líder presente em").font(PazTypography.titleSmall).foregroundStyle(PazColors.ink)
            HStack(spacing: PazSpacing.sm) {
                ForEach(LifeGroupMeetingRules.shared.leaderAttendedOptions, id: \.value) { option in
                    PazPillChip(
                        label: option.label,
                        selected: LifeGroupMeetingRules.shared.hasValue(
                            raw: viewModel.reportDraft.leaderAttended,
                            value: option.value
                        ),
                        onTap: {
                            guard isEnabled else { return }
                            viewModel.updateReport(
                                .leaderAttended,
                                to: LifeGroupMeetingRules.shared.toggleValue(
                                    raw: viewModel.reportDraft.leaderAttended,
                                    value: option.value
                                )
                            )
                        }
                    )
                    .opacity(isEnabled ? 1 : 0.5)
                }
            }
            field("Líder presente em (separe por vírgula)", .leaderAttended, .default, nil)
            field("Discípulos", .disciplesCount, .numberPad, "0")
            field("Discípulos discipulados na semana", .disciplesDiscipledThisWeek, .numberPad, "0")
        }
    }

    private var activityFields: some View {
        VStack(alignment: .leading, spacing: PazSpacing.md) {
            field(
                "Atividades de pastoreio (separe por vírgula)",
                .pastoringActivityType,
                .default,
                "Ex.: visita, ligação"
            )
            field("Outra atividade de pastoreio", .pastoringActivityOther, .default, nil)
            field("Atividades de treinamento (separe por vírgula)", .trainingActivityType, .default, nil)
            field("Outra atividade de treinamento", .trainingActivityOther, .default, nil)
        }
    }

    private func field(
        _ label: String, _ field: LifeGroupMeetingReportFormField, _ keyboard: UIKeyboardType, _ placeholder: String?
    ) -> some View {
        MeetingReportField(
            label: label,
            placeholder: placeholder ?? "",
            keyboard: keyboard,
            isEnabled: isEnabled,
            error: viewModel.reportErrors[field.validationField],
            text: Binding(
                get: { viewModel.reportDraft.value(of: field) },
                set: { newValue in
                    // Counts are digits-only (same filter as Android); offering/free text pass through.
                    let isCount = keyboard == .numberPad
                    viewModel.updateReport(field, to: isCount ? newValue.filter(\.isNumber) : newValue)
                }
            )
        )
    }
}
