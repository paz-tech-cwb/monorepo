import Kingfisher
import Shared
import SwiftUI

struct AgendaDetailView: View {
    let event: AgendaEvent
    @Environment(\.dismiss) private var dismiss

    /// "Confirmar presença" is hidden for now — kept in code, not deleted,
    /// in case the feature is re-enabled later.
    private let isAttendanceConfirmationEnabled = false

    var body: some View {
        if isAttendanceConfirmationEnabled {
            content
                .safeAreaInset(edge: .bottom, spacing: 0) {
                    confirmButton
                }
        } else {
            content
        }
    }

    private var content: some View {
        GeometryReader { geo in
            ZStack(alignment: .top) {
                PazColors.background.ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 0) {
                        heroArea
                        bodyCard(containerHeight: geo.size.height + geo.safeAreaInsets.top + geo.safeAreaInsets.bottom)
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
        }
        .toolbar(.hidden, for: .navigationBar)
    }

    // MARK: - Hero

    private let heroHeight: CGFloat = 300
    private let heroOverlap: CGFloat = 20

    private var heroArea: some View {
        ZStack(alignment: .bottom) {
            if let imageUrl = event.imageUrl, !imageUrl.isEmpty, let url = URL(string: imageUrl) {
                KFImage(url)
                    .resizable()
                    .placeholder { PazColors.heroGradient }
                    .fade(duration: 0.2)
                    .scaledToFill()
                    .frame(maxWidth: .infinity, minHeight: heroHeight, maxHeight: heroHeight)
                    .clipped()
                    .overlay(LinearGradient(
                        colors: [.black.opacity(0.3), .black.opacity(0.7)],
                        startPoint: .top,
                        endPoint: .bottom
                    ))
            } else {
                PazColors.heroGradient.frame(height: heroHeight)
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

    /// Extends to the true bottom of the screen rather than stopping halfway —
    /// only the top corners are rounded since the panel now reaches the
    /// screen edge. Measured from the actual available container height
    /// (via GeometryReader in `content`) rather than `UIScreen.main.bounds`,
    /// so this stays correct on iPad Split View / Stage Manager where the
    /// app's window is smaller than the physical screen.
    private func bodyCardMinHeight(containerHeight: CGFloat) -> CGFloat {
        containerHeight - heroHeight + heroOverlap
    }

    private func bodyCard(containerHeight: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: 20) {
            // Meta chips — location only (the date is already shown by the
            // PazGoldBadge in the hero area, so no duplicate calendar chip).
            if let loc = event.location, !loc.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        MetaChip(icon: "mappin.circle.fill", label: loc)
                    }
                }
            }

            // Description rendered inline — no "Geral"/"Informações" tabs.
            if let desc = event.description_, !desc.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Descrição").font(PazTypography.titleSmall)
                    Text(desc).font(PazTypography.bodySmall).foregroundStyle(PazColors.slate)
                }
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Descrição").font(PazTypography.titleSmall)
                    Text("Descrição em breve.")
                        .font(PazTypography.bodySmall)
                        .foregroundStyle(PazColors.slate)
                }
            }

            Spacer().frame(height: 16)
        }
        .padding(20)
        .frame(maxWidth: .infinity, minHeight: bodyCardMinHeight(containerHeight: containerHeight), alignment: .top)
        .background(
            PazMeshBackground()
                .ignoresSafeArea(edges: .bottom)
        )
        .clipShape(
            UnevenRoundedRectangle(
                topLeadingRadius: 28,
                bottomLeadingRadius: 0,
                bottomTrailingRadius: 0,
                topTrailingRadius: 28,
                style: .continuous
            )
        )
        .offset(y: -20)
    }

    // MARK: - Pinned CTA

    private var confirmButton: some View {
        Button(action: {}) {
            HStack(spacing: 8) {
                Image(systemName: "heart.fill")
                Text("Confirmar presença").font(PazTypography.titleMedium)
            }
        }
        .buttonStyle(.pazPillPrimary)
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .background(PazMeshBackground())
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
            Image(systemName: icon).font(.system(size: 12)).foregroundStyle(PazColors.accent)
            Text(label).font(PazTypography.labelSmall).foregroundStyle(PazColors.ink)
        }
        .padding(.horizontal, 12).padding(.vertical, 8)
        .glassCard(radius: 16)
    }
}

#Preview("Light") {
    AgendaDetailView(event: AgendaEvent(
        id: "1", title: "Culto de Domingo", description: "Venha participar",
        startDate: "2026-06-08T19:52", endDate: "2026-06-08T21:00", location: "Sede Paz Church",
        imageUrl: nil, recurrenceType: nil
    ))
}

#Preview("Dark") {
    AgendaDetailView(event: AgendaEvent(
        id: "1", title: "Culto de Domingo", description: "Venha participar",
        startDate: "2026-06-08T19:52", endDate: "2026-06-08T21:00", location: "Sede Paz Church",
        imageUrl: nil, recurrenceType: nil
    ))
    .preferredColorScheme(.dark)
}
