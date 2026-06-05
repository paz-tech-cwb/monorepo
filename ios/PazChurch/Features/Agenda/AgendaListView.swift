import Shared
import SwiftUI

struct AgendaListView: View {
    let events: [AgendaEvent]
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                PazColors.background.ignoresSafeArea()
                VStack(spacing: 0) {
                    headerBar
                    if events.isEmpty {
                        emptyState
                    } else {
                        eventList
                    }
                }
            }
            .navigationBarHidden(true)
        }
    }

    private var headerBar: some View {
        HStack(spacing: 14) {
            Button(action: { dismiss() }) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .background(.white.opacity(0.15))
                    .clipShape(Circle())
            }
            Text("Agenda").font(PazTypography.headlineMedium).foregroundStyle(.white)
            Spacer()
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
        .background(PazColors.heroGradient)
    }

    private var eventList: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Text("PRÓXIMOS EVENTOS")
                    .font(PazTypography.labelSmall)
                    .foregroundStyle(PazColors.slateLight)
                    .padding(.horizontal, 20)
                    .padding(.top, 16)

                ForEach(events, id: \.id) { event in
                    NavigationLink(destination: AgendaDetailView(event: event)) {
                        AgendaEventRow(event: event).padding(.horizontal, 20)
                    }
                    .buttonStyle(.plain)
                }
                Spacer().frame(height: 32)
            }
        }
        .background(PazColors.background)
    }

    private var emptyState: some View {
        VStack {
            Spacer()
            Text("Nenhum evento disponível").font(PazTypography.bodyMedium).foregroundStyle(PazColors.slate)
            Spacer()
        }
    }
}

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
        return VStack(spacing: 0) {
            Text(parts[safe: 2] ?? "--").font(PazTypography.titleMedium).foregroundStyle(PazColors.pazPrimary)
            Text(monthAbbrev(parts[safe: 1])).font(PazTypography.labelSmall).foregroundStyle(PazColors.pazSky)
        }
        .frame(width: 52, height: 52)
        .background(PazColors.pazPrimary.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func monthAbbrev(_ m: String?) -> String {
        switch m {
        case "01": "JAN"; case "02": "FEV"; case "03": "MAR"; case "04": "ABR"
        case "05": "MAI"; case "06": "JUN"; case "07": "JUL"; case "08": "AGO"
        case "09": "SET"; case "10": "OUT"; case "11": "NOV"; case "12": "DEZ"
        default: "???"
        }
    }
}

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}

#Preview("Light") { AgendaListView(events: []) }
#Preview("Dark") { AgendaListView(events: []).preferredColorScheme(.dark) }
