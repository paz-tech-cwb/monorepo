import Shared
import SwiftUI

struct LifeGroupAnalyticsView: View {
    @State private var viewModel: LifeGroupAnalyticsViewModel

    private static let monthLabels = [
        "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez",
    ]

    init(lifeGroupId: Int32?, analyticsRepository: LifeGroupAnalyticsRepository, churchRepository: ChurchRepository) {
        _viewModel = State(
            initialValue: LifeGroupAnalyticsViewModel(
                lifeGroupId: lifeGroupId,
                analyticsRepository: analyticsRepository,
                churchRepository: churchRepository
            )
        )
    }

    var body: some View {
        screenContent
            .background(PazMeshBackground())
            .navigationTitle("Relatórios")
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
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(yearOptions, id: \.self) { year in
                        FilterChip(label: "\(year)", isSelected: viewModel.year == year) {
                            viewModel.year = year
                            Task { await viewModel.load() }
                        }
                    }
                }
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    FilterChip(label: "Todos os meses", isSelected: viewModel.month == nil) {
                        viewModel.month = nil
                        Task { await viewModel.load() }
                    }
                    ForEach(1...12, id: \.self) { month in
                        FilterChip(
                            label: Self.monthLabels[month - 1],
                            isSelected: viewModel.month == Int32(month)
                        ) {
                            viewModel.month = Int32(month)
                            Task { await viewModel.load() }
                        }
                    }
                }
            }

            Menu {
                Button("Todos os grupos") {
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
                HStack {
                    Text(selectedLifeGroupLabel)
                        .font(PazTypography.bodySmall)
                        .foregroundStyle(PazColors.ink)
                    Spacer()
                    Image(systemName: "chevron.down")
                        .foregroundStyle(PazColors.slate)
                }
                .padding(12)
                .glassCard(radius: PazSpacing.cardRadiusCompact)
            }
        }
    }

    private var selectedLifeGroupLabel: String {
        guard let selectedId = viewModel.lifeGroupId else { return "Todos os grupos" }
        return viewModel.lifeGroups.first(where: { $0.id == selectedId })?.name ?? "Todos os grupos"
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
            return PazBarChartEntry(label: label, value: Double(point.presentCount))
        }
    }

    // MARK: Distribution

    private var distributionSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Distribuição dos Life Groups").font(PazTypography.titleSmall).foregroundStyle(PazColors.ink)

            HStack(spacing: 8) {
                ForEach(LifeGroupDistributionTab.allCases) { tab in
                    FilterChip(label: tab.label, isSelected: viewModel.distributionTab == tab) {
                        viewModel.distributionTab = tab
                    }
                }
            }

            let buckets = viewModel.distributionForSelectedTab
            if buckets.isEmpty {
                PazBarChartEmptyView(message: "Nenhum life group com esse dado cadastrado.")
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
