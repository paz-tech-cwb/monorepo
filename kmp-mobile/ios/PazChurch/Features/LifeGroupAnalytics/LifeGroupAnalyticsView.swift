import Shared
import SwiftUI

struct LifeGroupAnalyticsView: View {
    @State private var viewModel: LifeGroupAnalyticsViewModel

    private static let monthLabels = [
        "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez",
    ]

    init(lifeGroupId: Int32?, lifeGroupName: String? = nil, analyticsRepository: LifeGroupAnalyticsRepository) {
        _viewModel = State(
            initialValue: LifeGroupAnalyticsViewModel(
                lifeGroupId: lifeGroupId,
                lifeGroupName: lifeGroupName,
                analyticsRepository: analyticsRepository
            )
        )
    }

    var body: some View {
        screenContent
            .background(PazMeshBackground())
            .navigationTitle(viewModel.lockedGroupName ?? "Relatórios")
            .navigationBarTitleDisplayMode(.large)
            .toolbarBackground(.hidden, for: .navigationBar)
            .task {
                await viewModel.loadLifeGroups()
                await viewModel.load()
            }
    }

    @ViewBuilder
    private var screenContent: some View {
        if viewModel.isLoading {
            loadingState
        } else if let error = viewModel.error {
            errorState(message: error)
        } else {
            contentState
        }
    }

    private var contentState: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                filtersSection
                attendanceSection
                distributionSection
            }
            .padding(20)
        }
        .refreshable { await viewModel.load() }
    }

    // MARK: Filters

    private var filtersSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Menu {
                    ForEach(yearOptions, id: \.self) { year in
                        Button("\(year)") {
                            viewModel.year = year
                            Task { await viewModel.load() }
                        }
                    }
                } label: {
                    filterPickerLabel("\(viewModel.year)")
                }

                Menu {
                    Button("Todos os meses") {
                        viewModel.month = nil
                        Task { await viewModel.load() }
                    }
                    ForEach(1...12, id: \.self) { month in
                        Button(Self.monthLabels[month - 1]) {
                            viewModel.month = Int32(month)
                            Task { await viewModel.load() }
                        }
                    }
                } label: {
                    filterPickerLabel(viewModel.month.map { Self.monthLabels[Int($0) - 1] } ?? "Todos os meses")
                }

                if hasActiveFilters {
                    Button(action: viewModel.clearFilters) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(PazColors.slate)
                    }
                }
            }

            // Locked to a single group when opened from that group's own
            // "Relatórios" entry point — no picker, just its name. Only
            // shown as a switcher when opened unscoped (Relatórios tab or
            // Home shortcut) and the viewer can actually see more than one.
            if viewModel.isLockedToSingleGroup {
                if let name = viewModel.lockedGroupName {
                    filterPickerLabel(name, showChevron: false)
                }
            } else if viewModel.lifeGroups.count > 1 {
                Menu {
                    Button("All my Life Groups") {
                        viewModel.lifeGroupId = nil
                        Task { await viewModel.load() }
                    }
                    ForEach(viewModel.lifeGroups, id: \.id) { group in
                        Button(group.name) {
                            viewModel.lifeGroupId = group.id
                            Task { await viewModel.load() }
                        }
                    }
                } label: {
                    filterPickerLabel(selectedLifeGroupLabel)
                }
            } else if let onlyGroup = viewModel.lifeGroups.first {
                filterPickerLabel(onlyGroup.name, showChevron: false)
            }
        }
    }

    private var hasActiveFilters: Bool {
        viewModel.month != nil
            || viewModel.year != Int(Calendar.current.component(.year, from: Date()))
            || (!viewModel.isLockedToSingleGroup && viewModel.lifeGroupId != nil)
    }

    private func filterPickerLabel(_ text: String, showChevron: Bool = true) -> some View {
        HStack {
            Text(text)
                .font(PazTypography.bodySmall)
                .foregroundStyle(PazColors.ink)
            if showChevron {
                Spacer()
                Image(systemName: "chevron.down")
                    .font(.system(size: 12))
                    .foregroundStyle(PazColors.slate)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .glassCard(radius: PazSpacing.cardRadiusCompact)
    }

    private var selectedLifeGroupLabel: String {
        guard let selectedId = viewModel.lifeGroupId else { return "All my Life Groups" }
        return viewModel.lifeGroups.first(where: { $0.id == selectedId })?.name ?? "All my Life Groups"
    }

    private var yearOptions: [Int] {
        let current = Calendar.current.component(.year, from: Date())
        return (0..<5).map { current - $0 }
    }

    // MARK: Attendance

    private var attendanceSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Frequência de Presença").font(PazTypography.titleSmall).foregroundStyle(PazColors.ink)
            // Monthly rows are always zero-filled for all 12 months, so the
            // array is never actually empty for that view — check every row
            // has zero meetings instead of just checking array emptiness.
            if viewModel.attendanceRows.allSatisfy({ $0.meetingsCount == 0 }) {
                PazBarChartEmptyView(message: "Nenhum registro de presença encontrado.")
            } else {
                PazBarChartView(entries: attendanceChartEntries)
            }
        }
        .padding(16)
        .glassCard(radius: PazSpacing.cardRadiusCompact)
    }

    private var attendanceChartEntries: [PazBarChartEntry] {
        let perMeeting = viewModel.month != nil
        return viewModel.attendanceRows.map { point in
            let parts = point.period.split(separator: "-")
            let label: String
            if perMeeting, parts.count == 3 {
                label = "\(parts[2])/\(parts[1])"
            } else if parts.count >= 2, let monthIndex = Int(parts[1]), Self.monthLabels.indices.contains(monthIndex - 1) {
                label = Self.monthLabels[monthIndex - 1]
            } else {
                label = point.period
            }
            let percentage = point.attendanceRate * 100
            return PazBarChartEntry(label: label, value: percentage, displayValue: "\(Int(percentage.rounded()))%")
        }
    }

    // MARK: Distribution

    private var distributionSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Life Groups Distribution").font(PazTypography.titleSmall).foregroundStyle(PazColors.ink)

            HStack(spacing: 8) {
                ForEach(LifeGroupDistributionTab.allCases) { tab in
                    FilterChip(label: tab.label, isSelected: viewModel.distributionTab == tab) {
                        viewModel.distributionTab = tab
                    }
                }
            }

            let buckets = viewModel.distributionForSelectedTab
            if buckets.isEmpty {
                PazBarChartEmptyView(message: "No Life Group with this data registered.")
            } else {
                PazBarChartView(
                    entries: buckets.map { PazBarChartEntry(label: $0.label, value: Double($0.count)) }
                )
            }
        }
        .padding(16)
        .glassCard(radius: PazSpacing.cardRadiusCompact)
    }

    // MARK: States

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
                ForEach(0..<3, id: \.self) { _ in SkeletonView().frame(height: 220).padding(.horizontal, 20) }
                Spacer()
            }
        }
    }
}

private struct FilterChip: View {
    let label: String
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            Text(label)
                .font(PazTypography.bodySmall)
                .foregroundStyle(isSelected ? Color.white : PazColors.ink)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(isSelected ? PazColors.accent : PazColors.ink.opacity(0.06))
                .clipShape(Capsule())
        }
    }
}
