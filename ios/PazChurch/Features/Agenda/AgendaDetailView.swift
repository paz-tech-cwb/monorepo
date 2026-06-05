import Shared
import SwiftUI

struct AgendaDetailView: View {
    let event: AgendaEvent
    @Environment(\.dismiss) private var dismiss
    @State private var selectedTab = "geral"

    var body: some View {
        ZStack(alignment: .top) {
            PazColors.background.ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    heroArea
                    bodyCard
                }
            }
            .ignoresSafeArea(edges: .top)

            // Floating back button
            Button(action: { dismiss() }) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .background(.white.opacity(0.18))
                    .clipShape(Circle())
            }
            .padding(.top, 56)
            .padding(.leading, 20)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .navigationBarHidden(true)
    }

    private var heroArea: some View {
        ZStack(alignment: .bottom) {
            PazColors.heroGradient.frame(height: 300)
                .overlay(
                    Image(systemName: "plus")
                        .font(.system(size: 180, weight: .ultraLight))
                        .foregroundStyle(.white.opacity(0.08))
                )
            VStack(alignment: .leading, spacing: 8) {
                PazGoldBadge(text: String(event.startDate.prefix(8)).uppercased())
                Text(event.title)
                    .font(PazTypography.headlineMedium)
                    .foregroundStyle(.white)
                    .shadow(color: .black.opacity(0.3), radius: 4, y: 2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 20)
            .padding(.bottom, 32)
        }
    }

    private var bodyCard: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Meta chips
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    MetaChip(icon: "calendar", label: formatDate(event.startDate, event.endDate))
                    if let loc = event.location, !loc.isEmpty {
                        MetaChip(icon: "mappin.circle.fill", label: loc)
                    }
                }
            }

            // Tab bar
            HStack(spacing: 32) {
                ForEach([("geral", "Geral"), ("info", "Informações")], id: \.0) { key, label in
                    Button(action: { selectedTab = key }) {
                        VStack(spacing: 6) {
                            Text(label)
                                .font(PazTypography.titleSmall)
                                .foregroundStyle(selectedTab == key ? PazColors.pazPrimary : PazColors.slate)
                            Rectangle()
                                .fill(selectedTab == key ? PazColors.pazPrimary : Color.clear)
                                .frame(height: 2.5)
                        }
                    }
                    .buttonStyle(.plain)
                }
                Spacer()
            }

            // Tab content
            if selectedTab == "geral" {
                if let desc = event.description_, !desc.isEmpty {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Descrição").font(PazTypography.titleSmall)
                        Text(desc).font(PazTypography.bodySmall).foregroundStyle(PazColors.slate)
                    }
                }
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Detalhes do Evento").font(PazTypography.titleSmall)
                    Text("Informações adicionais em breve.").font(PazTypography.bodySmall)
                        .foregroundStyle(PazColors.slate)
                }
            }

            // CTA
            Button(action: {}) {
                HStack(spacing: 8) {
                    Image(systemName: "heart.fill")
                    Text("Confirmar presença").font(PazTypography.titleMedium)
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity).frame(height: 56)
                .background(PazColors.heroGradient)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .shadow(color: PazColors.pazPrimaryMid.opacity(0.4), radius: 12, y: 6)
            }
            .buttonStyle(.plain)
            .padding(.top, 8)

            Spacer().frame(height: 16)
        }
        .padding(20)
        .background(PazColors.background)
        .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
        .offset(y: -20)
    }

    private func formatDate(_ start: String, _ end: String?) -> String {
        guard let end, !end.isEmpty else { return start }
        return "\(start) — \(end)"
    }
}

private struct MetaChip: View {
    let icon: String
    let label: String

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon).font(.system(size: 12)).foregroundStyle(PazColors.pazPrimary)
            Text(label).font(PazTypography.labelSmall).foregroundStyle(PazColors.ink)
        }
        .padding(.horizontal, 12).padding(.vertical, 8)
        .background(PazColors.surface)
        .clipShape(Capsule())
    }
}

#Preview("Light") {
    AgendaDetailView(event: AgendaEvent(
        id: "1", title: "Culto de Domingo", description: "Venha participar",
        startDate: "2026-06-08", endDate: "2026-06-08", location: "Sede Paz Church", imageUrl: nil
    ))
}

#Preview("Dark") {
    AgendaDetailView(event: AgendaEvent(
        id: "1", title: "Culto de Domingo", description: "Venha participar",
        startDate: "2026-06-08", endDate: "2026-06-08", location: "Sede Paz Church", imageUrl: nil
    ))
    .preferredColorScheme(.dark)
}
