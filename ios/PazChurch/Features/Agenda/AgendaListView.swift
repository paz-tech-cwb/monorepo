import Kingfisher
import Shared
import SwiftUI

// MARK: - View

struct AgendaListView: View {
    @State private var viewModel: AgendaListViewModel

    init(agendaRepository: AgendaRepository) {
        _viewModel = State(initialValue: AgendaListViewModel(agendaRepository: agendaRepository))
    }

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    loadingState
                } else if viewModel.events.isEmpty {
                    emptyState
                } else {
                    eventList
                }
            }
            .background(PazColors.background)
            .navigationTitle("Agenda")
            .navigationBarTitleDisplayMode(.large)
        }
        .task { await viewModel.loadFirstPage() }
    }

    private var loadingState: some View {
        VStack { Spacer(); ProgressView().tint(PazColors.pazPrimary); Spacer() }
    }

    private var emptyState: some View {
        VStack {
            Spacer()
            Text("Nenhum evento disponível").font(PazTypography.bodyMedium).foregroundStyle(PazColors.slate)
            Spacer()
        }
    }

    private var eventList: some View {
        let yearSections = viewModel.events.toYearSections()
        return ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                ForEach(yearSections, id: \.year) { yearSection in
                    YearSectionView(
                        yearSection: yearSection,
                        isLastEvent: { $0.id == viewModel.events.last?.id },
                        onAppearLast: { viewModel.loadMore() }
                    )
                }

                if viewModel.isLoadingMore {
                    HStack {
                        Spacer()
                        ProgressView().tint(PazColors.pazPrimary).padding(.vertical, 20)
                        Spacer()
                    }
                }
                Spacer().frame(height: 32)
            }
            .padding(.horizontal, 20)
        }
        .background(PazColors.background)
    }
}

// MARK: - Year section

private struct YearSectionView: View {
    let yearSection: AgendaYearSection
    let isLastEvent: (AgendaEvent) -> Bool
    let onAppearLast: () -> Void

    @State private var isExpanded: Bool

    init(
        yearSection: AgendaYearSection,
        isLastEvent: @escaping (AgendaEvent) -> Bool,
        onAppearLast: @escaping () -> Void
    ) {
        self.yearSection = yearSection
        self.isLastEvent = isLastEvent
        self.onAppearLast = onAppearLast
        // Default: current year starts expanded
        let currentYear = Calendar.current.component(.year, from: Date())
        _isExpanded = State(initialValue: yearSection.year == String(currentYear))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Year header row
            Button(action: { withAnimation(.spring(response: 0.3, dampingFraction: 0.75)) { isExpanded.toggle() } }) {
                HStack {
                    Text(yearSection.year)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(PazColors.ink)
                    Spacer()
                    Image(systemName: "chevron.down")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(PazColors.slate)
                        .rotationEffect(.degrees(isExpanded ? 180 : 0))
                        .animation(.spring(response: 0.3, dampingFraction: 0.75), value: isExpanded)
                }
                .padding(.vertical, 14)
            }
            .buttonStyle(.plain)

            if isExpanded {
                ForEach(yearSection.dateSections, id: \.label) { dateSection in
                    // Date sub-header
                    Text(dateSection.label)
                        .font(PazTypography.labelSmall)
                        .foregroundStyle(PazColors.pazPrimary)
                        .padding(.top, 16)
                        .padding(.bottom, 8)

                    // Events under this date
                    ForEach(dateSection.events, id: \.id) { event in
                        NavigationLink(destination: AgendaDetailView(event: event)) {
                            AgendaEventRow(event: event)
                        }
                        .buttonStyle(.plain)
                        .padding(.bottom, 8)
                        .onAppear {
                            if isLastEvent(event) { onAppearLast() }
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Row

private struct AgendaEventRow: View {
    let event: AgendaEvent

    var body: some View {
        HStack(spacing: 12) {
            dateBox
            VStack(alignment: .leading, spacing: 2) {
                Text(event.title).font(PazTypography.titleSmall).foregroundStyle(PazColors.ink).lineLimit(2)
                if let loc = event.location, !loc.isEmpty {
                    Text(loc).font(PazTypography.bodySmall).foregroundStyle(PazColors.slate).lineLimit(1)
                }
                if let recurrence = event.recurrenceType, !recurrence.isEmpty {
                    Text(recurrenceLabel(recurrence))
                        .font(PazTypography.labelSmall)
                        .foregroundStyle(PazColors.pazPrimary)
                }
            }
            Spacer()
            Circle().fill(PazColors.pazPrimary).frame(width: 8, height: 8)
        }
        .padding(14)
        .background(PazColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }

    private var dateBox: some View {
        let parts = event.startDate.split(separator: "-").map(String.init)
        return Group {
            if let imageUrl = event.imageUrl, !imageUrl.isEmpty, let url = URL(string: imageUrl) {
                KFImage(url)
                    .resizable().placeholder { PazColors.pazPrimary.opacity(0.08) }.fade(duration: 0.2)
                    .scaledToFill().frame(width: 52, height: 52).clipShape(RoundedRectangle(cornerRadius: 12))
            } else {
                VStack(spacing: 0) {
                    Text(String(parts[safe: 2]?.prefix(2) ?? "--"))
                        .font(PazTypography.titleMedium).foregroundStyle(PazColors.pazPrimary)
                    Text(monthAbbrev(parts[safe: 1]))
                        .font(PazTypography.labelSmall).foregroundStyle(PazColors.pazSky)
                }
                .frame(width: 52, height: 52)
                .background(PazColors.pazPrimary.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private func recurrenceLabel(_ type: String) -> String {
        switch type.uppercased() {
        case "WEEKLY": "Semanal"
        case "MONTHLY": "Mensal"
        case "YEARLY": "Anual"
        case "DAILY": "Diário"
        default: type
        }
    }

    private func monthAbbrev(_ m: String?) -> String {
        switch m {
        case "01": "JAN"; 
case "02": "FEV"; 
case "03": "MAR"; 
case "04": "ABR"
        case "05": "MAI"; 
case "06": "JUN"; 
case "07": "JUL"; 
case "08": "AGO"
        case "09": "SET"; 
case "10": "OUT"; 
case "11": "NOV"; 
case "12": "DEZ"
        default: "???"
        }
    }
}

// MARK: - Grouping models + helpers

struct AgendaYearSection {
    let year: String
    let dateSections: [AgendaDateSection]
}

struct AgendaDateSection {
    let label: String
    let events: [AgendaEvent]
}

private extension [AgendaEvent] {
    func toYearSections() -> [AgendaYearSection] {
        var yearOrder: [String] = []
        var yearMap: [String: [String: [AgendaEvent]]] = [:]
        var dateOrder: [String: [String]] = [:]

        for event in self {
            let year = String(event.startDate.prefix(4))
            let dateLabel = Self.dateSectionLabel(for: event.startDate)
            if yearMap[year] == nil {
                yearMap[year] = [:]
                yearOrder.append(year)
                dateOrder[year] = []
            }
            if yearMap[year]![dateLabel] == nil {
                yearMap[year]![dateLabel] = []
                dateOrder[year]!.append(dateLabel)
            }
            yearMap[year]![dateLabel]!.append(event)
        }

        return yearOrder.map { year in
            let sections = (dateOrder[year] ?? []).map { label in
                AgendaDateSection(label: label, events: yearMap[year]![label] ?? [])
            }
            return AgendaYearSection(year: year, dateSections: sections)
        }
    }

    private static func dateSectionLabel(for startDate: String) -> String {
        let isoFormatter = DateFormatter()
        isoFormatter.locale = Locale(identifier: "pt_BR")
        let formats = [
            "yyyy-MM-dd'T'HH:mm:ss.SSSZ",
            "yyyy-MM-dd'T'HH:mm:ssZ",
            "yyyy-MM-dd'T'HH:mm:ss",
            "yyyy-MM-dd'T'HH:mm",
            "yyyy-MM-dd",
        ]
        var date: Date?
        for fmt in formats {
            isoFormatter.dateFormat = fmt
            if let d = isoFormatter.date(from: startDate) { date = d; break }
        }
        guard let date else { return String(startDate.prefix(10)) }
        let out = DateFormatter()
        out.locale = Locale(identifier: "pt_BR")
        out.dateFormat = "dd 'de' MMMM (EEEE)"
        let raw = out.string(from: date)
        return raw.prefix(1).uppercased() + raw.dropFirst()
    }
}

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}

#Preview("Light") { AgendaListView(agendaRepository: IosAppContainer.shared.agendaRepository) }
#Preview("Dark") {
    AgendaListView(agendaRepository: IosAppContainer.shared.agendaRepository).preferredColorScheme(.dark)
}
