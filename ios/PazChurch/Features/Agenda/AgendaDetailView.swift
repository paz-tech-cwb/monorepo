import SwiftUI
import Shared

struct AgendaDetailView: View {
    let event: AgendaEvent
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                VStack(spacing: 0) {
                    // Hero header
                    VStack(alignment: .leading) {
                        HStack(spacing: PazSpacing.lg) {
                            Button(action: { dismiss() }) {
                                Image(systemName: "chevron.left")
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(.white)
                            }
                            Text("Evento")
                                .font(PazTypography.headlineMedium)
                                .foregroundColor(.white)
                            Spacer()
                        }
                        .padding(.horizontal, PazSpacing.lg)
                        .padding(.vertical, PazSpacing.md)
                    }
                    .background(PazColors.heroGradient)

                    // Content
                    ScrollView {
                        VStack(alignment: .leading, spacing: PazSpacing.lg) {
                            Spacer().frame(height: PazSpacing.lg)

                            VStack(alignment: .leading, spacing: PazSpacing.sm) {
                                Text(event.title)
                                    .font(PazTypography.headlineSmall)
                                Text("Evento da Igreja")
                                    .font(PazTypography.labelSmall)
                                    .foregroundColor(PazColors.primary)
                            }
                            .padding(.horizontal, PazSpacing.lg)

                            VStack(spacing: PazSpacing.md) {
                                HStack(spacing: PazSpacing.md) {
                                    Image(systemName: "clock.fill")
                                        .font(.system(size: 14))
                                        .foregroundColor(PazColors.primary)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("Data e Hora")
                                            .font(PazTypography.labelSmall)
                                            .foregroundColor(.gray)
                                        Text("\(event.startDate) — \(event.endDate ?? event.startDate)")
                                            .font(PazTypography.bodySmall)
                                    }
                                    Spacer()
                                }

                                if let location = event.location {
                                    HStack(spacing: PazSpacing.md) {
                                        Image(systemName: "mappin.circle.fill")
                                            .font(.system(size: 14))
                                            .foregroundColor(PazColors.primary)
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text("Local")
                                                .font(PazTypography.labelSmall)
                                                .foregroundColor(.gray)
                                            Text(location)
                                                .font(PazTypography.bodySmall)
                                        }
                                        Spacer()
                                    }
                                }
                            }
                            .padding(PazSpacing.lg)
                            .background(PazColors.surface)
                            .cornerRadius(16)
                            .padding(.horizontal, PazSpacing.lg)

                            if let description = event.description_, !description.isEmpty {
                                VStack(alignment: .leading, spacing: PazSpacing.sm) {
                                    Text("Descrição")
                                        .font(PazTypography.titleSmall)
                                    Text(description)
                                        .font(PazTypography.bodySmall)
                                        .foregroundColor(.gray)
                                }
                                .padding(.horizontal, PazSpacing.lg)
                            }

                            Spacer().frame(height: PazSpacing.xl)
                        }
                    }
                    .background(PazColors.background)
                }
                .background(PazColors.background)
            }
        }
        .navigationBarBackButtonHidden()
    }
}

#Preview {
    AgendaDetailView(event: AgendaEvent(
        id: "1",
        title: "Reunião de Célula",
        description: "Reunião semanal do grupo de vida",
        startDate: "2024-06-01",
        endDate: "2024-06-01",
        location: "Rua Principal, 123",
        imageUrl: nil
    ))
}
