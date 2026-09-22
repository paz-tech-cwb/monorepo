import Shared
import SwiftUI

struct CasaDePazAnalyticsView: View {
    @State private var viewModel: CasaDePazAnalyticsViewModel
    @State private var editingTarget: DateFilterTarget?
    @State private var draftDate: Date = Date()

    private static let monthLabels = [
        "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez",
    ]

    private enum DateFilterTarget: Identifiable {
        case from, to
        var id: Self {
            self
        }
    }

    init(analyticsRepository: CasaDePazAnalyticsRepository) {
        _viewModel = State(initialValue: CasaDePazAnalyticsViewModel(repository: analyticsRepository))
    }

    var body: some View {
        screenContent
            .background(PazMeshBackground())
            .navigationTitle("Casa de Paz")
            .navigationBarTitleDisplayMode(.large)
            .toolbarBackground(.hidden, for: .navigationBar)
            .task { await viewModel.load() }
            .sheet(item: $editingTarget) { target in
                dateSheet(for: target)
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
                if let summary = viewModel.summary {
                    CasaDePazStatCards(summary: summary)
                    CasaDePazCharts(summary: summary)
                }
            }
            .padding(20)
        }
        .refreshable { await viewModel.load() }
    }

    // MARK: Filters — free from/to date range, matching admin-ui exactly.

    private var filtersSection: some View {
        HStack(spacing: 12) {
            dateFilterButton(label: "De", value: viewModel.from) { editingTarget = .from }
            dateFilterButton(label: "Até", value: viewModel.to) { editingTarget = .to }
        }
    }

    private func dateFilterButton(label: String, value: String, action: @escaping () -> Void) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(PazTypography.labelSmall).foregroundStyle(PazColors.slate)
            Button(action: action) {
                Text(value)
                    .font(PazTypography.bodySmall)
                    .foregroundStyle(PazColors.ink)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(12)
            .glassCard(radius: PazSpacing.cardRadiusCompact)
        }
        .frame(maxWidth: .infinity)
    }

    @ViewBuilder
    private func dateSheet(for target: DateFilterTarget) -> some View {
        // Local draft state: the picker only mutates `draftDate` while the
        // sheet is open. `viewModel.onFromSelected`/`onToSelected` (which
        // trigger a network load and flip `isLoading`, tearing the
        // `.sheet(item:)` out of the hierarchy since it's attached above a
        // state branch) are only called once, on explicit "OK" confirm —
        // never on every day-tap/month-scrub of `.datePickerStyle(.graphical)`.
        NavigationStack {
            DatePicker(
                target == .from ? "De" : "Até",
                selection: $draftDate,
                displayedComponents: .date
            )
            .datePickerStyle(.graphical)
            .padding()
            .navigationTitle(target == .from ? "Data inicial" : "Data final")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("OK") {
                        let iso = CasaDePazAnalyticsView.formatIso(draftDate)
                        if target == .from {
                            viewModel.onFromSelected(iso)
                        } else {
                            viewModel.onToSelected(iso)
                        }
                        editingTarget = nil
                    }
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { editingTarget = nil }
                }
            }
        }
        .presentationDetents([.medium])
        .onAppear {
            let iso = target == .from ? viewModel.from : viewModel.to
            draftDate = CasaDePazAnalyticsView.parseIso(iso) ?? Date()
        }
    }

    private static func parseIso(_ iso: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone.current
        return formatter.date(from: iso)
    }

    private static func formatIso(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone.current
        return formatter.string(from: date)
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
