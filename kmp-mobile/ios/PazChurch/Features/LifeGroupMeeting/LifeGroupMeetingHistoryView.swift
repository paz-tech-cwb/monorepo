import Shared
import SwiftUI

/// "Reuniões" of one group, with a segmented control: the meetings list (past meetings with presence + report
/// chips and the "Nova reunião" date picker) and "Relatórios" (this group's stats only).
struct LifeGroupMeetingHistoryView: View {
    let lifeGroupId: Int32
    @State private var viewModel: LifeGroupMeetingHistoryViewModel
    @State private var analytics: LifeGroupAnalyticsViewModel
    private let groupName: String?
    @State private var openedDate: String?
    @State private var showDatePicker = false

    init(lifeGroupId: Int32, groupName: String? = nil, meetingDay: String?, canWrite: Bool) {
        self.lifeGroupId = lifeGroupId
        self.groupName = groupName
        _viewModel = State(
            initialValue: LifeGroupMeetingHistoryViewModel(
                lifeGroupId: lifeGroupId,
                meetingDay: meetingDay,
                canWrite: canWrite,
                source: KotlinLifeGroupMeetingHistorySource(
                    attendanceRepository: IosAppContainer.shared.lifeGroupAttendanceRepository,
                    reportRepository: IosAppContainer.shared.lifeGroupReportRepository
                )
            )
        )
        _analytics = State(
            initialValue: LifeGroupAnalyticsViewModel(
                lifeGroupId: lifeGroupId,
                analyticsRepository: IosAppContainer.shared.lifeGroupAnalyticsRepository
            )
        )
    }

    var body: some View {
        VStack(spacing: 0) {
            Picker("Seção", selection: $viewModel.selectedTab) {
                ForEach(LifeGroupMeetingsTab.allCases) { tab in
                    Text(tab.label).tag(tab)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, PazSpacing.lg)
            .padding(.vertical, PazSpacing.sm)

            switch viewModel.selectedTab {
            case .meetings:
                meetingsContent
            case .reports:
                LifeGroupAnalyticsPanel(viewModel: analytics, groupName: groupName)
            }
        }
        .pazScreenBackground()
        .navigationTitle("Reuniões")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.hidden, for: .navigationBar)
        .toolbar {
            if viewModel.canWrite, viewModel.selectedTab == .meetings {
                ToolbarItem(placement: .primaryAction) {
                    Button("Nova reunião", systemImage: "plus") { showDatePicker = true }
                }
            }
        }
        .sheet(isPresented: $showDatePicker) {
            NewMeetingDateSheet(viewModel: viewModel) { date in
                showDatePicker = false
                openedDate = date
            }
            .presentationDetents([.large])
        }
        .navigationDestination(item: $openedDate) { date in
            LifeGroupMeetingView(lifeGroupId: lifeGroupId, meetingDate: date, canWrite: viewModel.canWrite)
        }
        .onChange(of: openedDate) { _, newValue in
            // Coming back from a meeting: pick up what was just saved.
            if newValue == nil {
                Task { await viewModel.refresh() }
            }
        }
        .task { await viewModel.load() }
    }

    @ViewBuilder
    private var meetingsContent: some View {
        if viewModel.isLoading {
            ScrollView {
                VStack(spacing: PazSpacing.md) {
                    ForEach(0..<5, id: \.self) { _ in SkeletonView().frame(height: 72) }
                }
                .padding(PazSpacing.lg)
            }
        } else if let error = viewModel.error {
            ErrorStateView(message: error, onRetry: { Task { await viewModel.load() } })
        } else if viewModel.meetings.isEmpty {
            ContentUnavailableView(
                "Nenhuma reunião registrada ainda",
                systemImage: "person.3",
                description: Text(viewModel.canWrite ? "Toque em + (Nova reunião) para começar." : "")
            )
        } else {
            List {
                ForEach(viewModel.meetings, id: \.date) { meeting in
                    Button(action: { openedDate = meeting.date }) { MeetingSummaryRow(meeting: meeting) }
                        .buttonStyle(.plain)
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .refreshable { await viewModel.refresh() }
        }
    }
}

private struct MeetingSummaryRow: View {
    let meeting: LifeGroupMeetingSummary

    var body: some View {
        let chips = LifeGroupMeetingRowChips(meeting)
        HStack(spacing: PazSpacing.md) {
            Image(systemName: "person.3.fill").foregroundStyle(PazColors.accent)
            VStack(alignment: .leading, spacing: PazSpacing.xs) {
                Text(brDateString(fromISODate: meeting.date)).font(PazTypography.titleSmall)
                    .foregroundStyle(PazColors.ink)
                HStack(spacing: PazSpacing.sm) {
                    if let presence = chips.presenceText {
                        MeetingStatusPill(text: presence, done: true)
                    }
                    if let report = chips.reportText {
                        MeetingStatusPill(text: report, done: chips.reportDone)
                    }
                }
            }
            Spacer()
            Image(systemName: "chevron.right").font(.system(size: 14)).foregroundStyle(.gray)
        }
        .padding(PazSpacing.lg)
        .glassCard(radius: PazSpacing.cardRadiusCompact)
    }
}

/// Date picker for "Nova reunião": defaults to the latest regular meeting day, never allows future dates.
private struct NewMeetingDateSheet: View {
    let viewModel: LifeGroupMeetingHistoryViewModel
    let onConfirm: (String) -> Void

    @State private var selected: Date
    @Environment(\.dismiss) private var dismiss

    init(viewModel: LifeGroupMeetingHistoryViewModel, onConfirm: @escaping (String) -> Void) {
        self.viewModel = viewModel
        self.onConfirm = onConfirm
        _selected = State(initialValue: LifeGroupMeetingDates.date(fromISO: viewModel.defaultNewMeetingDate) ?? Date())
    }

    private var selectedISO: String {
        LifeGroupMeetingDates.iso(from: selected)
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: PazSpacing.md) {
                DatePicker(
                    "Data da reunião",
                    selection: $selected,
                    in: ...(LifeGroupMeetingDates.date(fromISO: viewModel.latestSelectableDate) ?? Date()),
                    displayedComponents: .date
                )
                .datePickerStyle(.graphical)
                .environment(\.locale, Locale(identifier: "pt_BR"))
                if viewModel.needsExtraMeeting(selectedISO) {
                    Text("Esta data não é o dia regular do grupo: ela será registrada como reunião extra.")
                        .font(PazTypography.bodySmall)
                        .foregroundStyle(PazColors.slate)
                }
                Spacer()
            }
            .padding(PazSpacing.lg)
            .navigationTitle("Nova reunião")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancelar") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Abrir") {
                        if let date = viewModel.validatedNewMeetingDate(selectedISO) {
                            onConfirm(date)
                        }
                    }
                }
            }
        }
    }
}
