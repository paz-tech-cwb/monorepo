import Kingfisher
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
            .safeAreaInset(edge: .bottom, spacing: 0) {
                confirmButton
            }

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

    // MARK: - Hero

    private var heroArea: some View {
        ZStack(alignment: .bottom) {
            if let imageUrl = event.imageUrl, !imageUrl.isEmpty, let url = URL(string: imageUrl) {
                KFImage(url)
                    .resizable()
                    .placeholder { PazColors.heroGradient }
                    .fade(duration: 0.2)
                    .scaledToFill()
                    .frame(maxWidth: .infinity, minHeight: 300, maxHeight: 300)
                    .clipped()
                    .overlay(LinearGradient(
                        colors: [.black.opacity(0.3), .black.opacity(0.7)],
                        startPoint: .top,
                        endPoint: .bottom
                    ))
            } else {
                PazColors.heroGradient.frame(height: 300)
                    .overlay(
                        Image(systemName: "plus")
                            .font(.system(size: 180, weight: .ultraLight))
                            .foregroundStyle(.white.opacity(0.08))
                    )
            }
            VStack(alignment: .leading, spacing: 8) {
                PazGoldBadge(text: formatDetailDate(event.startDate).uppercased())
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

    // MARK: - Body card (no CTA inside)

    private var bodyCard: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Meta chips
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    MetaChip(icon: "calendar", label: formatDetailDate(event.startDate))
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

            Spacer().frame(height: 16)
        }
        .padding(20)
        .background(PazColors.background)
        .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
        .offset(y: -20)
    }

    // MARK: - Pinned CTA

    private var confirmButton: some View {
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
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .background(PazColors.background)
    }

    // MARK: - Date formatting

    private func formatDetailDate(_ iso: String) -> String {
        let formats = [
            "yyyy-MM-dd'T'HH:mm:ss.SSSZ",
            "yyyy-MM-dd'T'HH:mm:ssZ",
            "yyyy-MM-dd'T'HH:mm:ss",
            "yyyy-MM-dd'T'HH:mm",
            "yyyy-MM-dd",
        ]
        let f = DateFormatter()
        f.locale = Locale(identifier: "pt_BR")
        var date: Date?
        for fmt in formats {
            f.dateFormat = fmt
            if let d = f.date(from: iso) { date = d; break }
        }
        guard let date else { return iso }
        let out = DateFormatter()
        out.dateFormat = "dd/MM/yyyy HH:mm"
        return out.string(from: date)
    }
}

// MARK: - MetaChip

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
        startDate: "2026-06-08T19:52", endDate: "2026-06-08T21:00", location: "Sede Paz Church", imageUrl: nil
    ))
}

#Preview("Dark") {
    AgendaDetailView(event: AgendaEvent(
        id: "1", title: "Culto de Domingo", description: "Venha participar",
        startDate: "2026-06-08T19:52", endDate: "2026-06-08T21:00", location: "Sede Paz Church", imageUrl: nil
    ))
    .preferredColorScheme(.dark)
}
