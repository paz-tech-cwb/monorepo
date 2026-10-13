import Shared
import SwiftUI

/// Combined "Reunião" screen: presence section + weekly report section for one (group, date).
struct LifeGroupMeetingView: View {
    @State private var viewModel: LifeGroupMeetingViewModel

    init(lifeGroupId: Int32, meetingDate: String) {
        _viewModel = State(
            initialValue: LifeGroupMeetingViewModel(
                lifeGroupId: lifeGroupId,
                meetingDate: meetingDate,
                service: KotlinLifeGroupMeetingService(repository: IosAppContainer.shared.lifeGroupMeetingRepository),
                draftStore: KotlinLifeGroupMeetingDraftStore(store: IosAppContainer.shared.meetingDraftStore),
                currentUserId: { try? await IosAppContainer.shared.authRepository.currentUser()?.id }
            )
        )
    }

    var body: some View {
        content
            .background(PazMeshBackground())
            .navigationTitle("Reunião")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.hidden, for: .navigationBar)
            .task { await viewModel.load() }
    }

    @ViewBuilder
    private var content: some View {
        if viewModel.isLoading {
            ScrollView {
                VStack(spacing: PazSpacing.md) {
                    ForEach(0..<6, id: \.self) { _ in SkeletonView().frame(height: 52) }
                }
                .padding(PazSpacing.lg)
            }
        } else if let error = viewModel.loadError {
            ErrorStateView(message: error, onRetry: { Task { await viewModel.load() } })
        } else if viewModel.needsExtraChoice {
            extraChoice
        } else {
            meetingContent
        }
    }

    private var extraChoice: some View {
        VStack(spacing: PazSpacing.md) {
            MeetingNoticeCard(
                text: "\(brDateString(fromISODate: viewModel.meetingDate)) não é o dia regular de reunião deste grupo. "
                    + "Para registrar uma reunião em outro dia, marque \"Reunião extra\".",
                isWarning: true
            )
            MeetingSwitchRow(
                title: "Reunião extra",
                subtitle: "Registra presença e relatório desta data como reunião extra.",
                isOn: Binding(get: { false }, set: { value in Task { await viewModel.setExtraMeeting(value) } }),
                isEnabled: true
            )
            Spacer()
        }
        .padding(PazSpacing.lg)
    }

    private var meetingContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: PazSpacing.md) {
                Text(brDateString(fromISODate: viewModel.meetingDate))
                    .font(PazTypography.titleLarge)
                    .foregroundStyle(PazColors.titleInk)
                headerSection
                MeetingSectionTitle(text: "Presença")
                LifeGroupMeetingAttendanceSection(viewModel: viewModel)
                MeetingSectionTitle(text: "Relatório")
                LifeGroupMeetingReportSection(viewModel: viewModel)
                Spacer().frame(height: PazSpacing.xl)
            }
            .padding(PazSpacing.lg)
        }
        .scrollDismissesKeyboard(.interactively)
    }

    @ViewBuilder
    private var headerSection: some View {
        if viewModel.draftRestored {
            MeetingNoticeCard(
                text: "Rascunho restaurado: suas alterações não salvas foram recuperadas.",
                actionLabel: "OK",
                onAction: { viewModel.dismissDraftBanner() }
            )
        }
        if let meeting = viewModel.meeting {
            if viewModel.isReadOnly {
                MeetingNoticeCard(
                    text: LifeGroupMeetingRules.shared.readOnlyMessage(editDeadline: meeting.editDeadline),
                    isWarning: true
                )
            } else if !meeting.editDeadline.isEmpty {
                Text(LifeGroupMeetingRules.shared.editableUntilMessage(editDeadline: meeting.editDeadline))
                    .font(PazTypography.bodySmall)
                    .foregroundStyle(PazColors.slate)
            }
            statusPills(meeting)
        }
        if viewModel.showExtraToggle, viewModel.meeting != nil {
            MeetingSwitchRow(
                title: "Reunião extra",
                subtitle: "Esta data não é o dia regular do grupo.",
                isOn: Binding(
                    get: { viewModel.isExtra },
                    set: { value in Task { await viewModel.setExtraMeeting(value) } }
                ),
                isEnabled: !viewModel.isExtraLocked && !viewModel.isReadOnly && !viewModel.isBusy
            )
        }
    }

    private func statusPills(_ meeting: LifeGroupMeeting) -> some View {
        HStack(spacing: PazSpacing.sm) {
            MeetingStatusPill(
                text: viewModel.isAttendanceSaved ? "Presença salva" : "Presença pendente",
                done: viewModel.isAttendanceSaved
            )
            MeetingStatusPill(
                text: viewModel.isReportSaved ? "Relatório enviado" : "Relatório pendente",
                done: viewModel.isReportSaved
            )
            if meeting.attendance?.isExtra == true || (viewModel.isExtra && viewModel.showExtraToggle) {
                MeetingStatusPill(text: "Reunião extra", done: true)
            }
        }
    }
}
