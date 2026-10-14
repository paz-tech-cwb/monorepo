import Shared
import SwiftUI

/// Formulários "Relatório de Grupo" entry / `paz://form/life-group-reports`: the Reunião flow. One led group opens
/// its "Reuniões" directly; otherwise a picker (every group for admin/pastor, supervised groups read-only).
struct LifeGroupMeetingEntryView: View {
    @State private var viewModel: LifeGroupMeetingEntryViewModel

    init(source: LifeGroupMeetingEntrySource = KotlinLifeGroupMeetingEntrySource(
        churchRepository: IosAppContainer.shared.churchRepository,
        authRepository: IosAppContainer.shared.authRepository
    )) {
        _viewModel = State(initialValue: LifeGroupMeetingEntryViewModel(source: source))
    }

    var body: some View {
        Group {
            if let direct = viewModel.directGroup {
                // The single group's own screen: it brings its own background and title.
                LifeGroupMeetingHistoryView(
                    lifeGroupId: direct.group.id,
                    groupName: direct.group.name,
                    meetingDay: direct.group.meetingDay,
                    canWrite: direct.canWrite
                )
            } else {
                pickerScreen
            }
        }
        .task { await viewModel.load() }
    }

    private var pickerScreen: some View {
        content
            .pazScreenBackground()
            .navigationTitle("Reuniões")
            .navigationBarTitleDisplayMode(.large)
            .toolbarBackground(.hidden, for: .navigationBar)
    }

    @ViewBuilder
    private var content: some View {
        if viewModel.isLoading {
            ScrollView {
                VStack(spacing: PazSpacing.md) {
                    ForEach(0..<4, id: \.self) { _ in SkeletonView().frame(height: 64) }
                }
                .padding(PazSpacing.lg)
            }
        } else if let error = viewModel.error {
            ErrorStateView(message: error, onRetry: { Task { await viewModel.load() } })
        } else if let message = viewModel.emptyMessage {
            ContentUnavailableView(
                "Nenhum Life Group",
                systemImage: "person.3",
                description: Text(message)
            )
        } else {
            ScrollView {
                VStack(spacing: PazSpacing.sm) {
                    ForEach(viewModel.pickerGroups, id: \.group.id) { item in
                        NavigationLink {
                            LifeGroupMeetingHistoryView(
                                lifeGroupId: item.group.id,
                                groupName: item.group.name,
                                meetingDay: item.group.meetingDay,
                                canWrite: item.canWrite
                            )
                        } label: {
                            LifeGroupEntryRow(item: item)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(PazSpacing.lg)
            }
        }
    }
}

private struct LifeGroupEntryRow: View {
    let item: LifeGroupMeetingEntryGroup

    var body: some View {
        HStack(spacing: PazSpacing.md) {
            Image(systemName: "person.3.fill").foregroundStyle(PazColors.accent)
            VStack(alignment: .leading, spacing: PazSpacing.xs) {
                Text(item.group.name).font(PazTypography.titleSmall).foregroundStyle(PazColors.ink)
                if !item.canWrite {
                    Text("Somente leitura").font(PazTypography.bodySmall).foregroundStyle(PazColors.slate)
                } else if let meeting = lifeGroupMeetingLabel(day: item.group.meetingDay, time: item.group.meetingTime) {
                    Text(meeting).font(PazTypography.bodySmall).foregroundStyle(PazColors.slate)
                }
            }
            Spacer()
            Image(systemName: "chevron.right").font(.system(size: 14)).foregroundStyle(.gray)
        }
        .padding(PazSpacing.lg)
        .glassCard(radius: PazSpacing.cardRadiusCompact)
    }
}
