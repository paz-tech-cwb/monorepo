import Shared
import SwiftUI

// MARK: - Ministry Detail

struct MinistryDetailView: View {
    let ministry: Ministry

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: PazSpacing.lg) {
                Spacer().frame(height: PazSpacing.lg)

                ZStack {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(PazColors.primary.opacity(0.12))
                        .frame(width: 72, height: 72)
                    Image(systemName: "person.3.fill")
                        .font(.system(size: 28))
                        .foregroundColor(PazColors.primary)
                }

                Text(ministry.name)
                    .font(PazTypography.headlineSmall)

                if let description = ministry.description_ {
                    VStack(alignment: .leading, spacing: PazSpacing.sm) {
                        Text("Sobre")
                            .font(PazTypography.titleSmall)
                        Text(description)
                            .font(PazTypography.bodySmall)
                            .foregroundColor(.gray)
                    }
                    .padding(PazSpacing.lg)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(PazColors.surface)
                    .cornerRadius(16)
                }

                Spacer().frame(height: PazSpacing.xl)
            }
            .padding(.horizontal, PazSpacing.lg)
        }
        .background(PazColors.background)
        .navigationTitle(ministry.name)
        .navigationBarTitleDisplayMode(.large)
    }
}

// MARK: - Life Group Detail

struct LifeGroupDetailView: View {
    let lifeGroup: LifeGroup

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: PazSpacing.lg) {
                    Spacer().frame(height: PazSpacing.lg)

                    HStack(spacing: PazSpacing.lg) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 16)
                                .fill(PazColors.primary.opacity(0.12))
                                .frame(width: 72, height: 72)
                            Image(systemName: "person.fill")
                                .font(.system(size: 28))
                                .foregroundColor(PazColors.primary)
                        }
                        VStack(alignment: .leading, spacing: PazSpacing.xs) {
                            Text(lifeGroup.name)
                                .font(PazTypography.headlineSmall)
                            Text("\(lifeGroup.membersCount) membros")
                                .font(PazTypography.labelSmall)
                                .foregroundColor(PazColors.primary)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 4)
                                .background(PazColors.primary.opacity(0.12))
                                .cornerRadius(20)
                        }
                    }

                    VStack(alignment: .leading, spacing: PazSpacing.md) {
                        if let leader = lifeGroup.leader {
                            InfoRowView(icon: "person.fill", label: "Líder", value: leader)
                        }
                        if lifeGroup.meetingDay != nil || lifeGroup.meetingTime != nil {
                            let meetingStr = [lifeGroup.meetingDay, lifeGroup.meetingTime]
                                .compactMap { $0 }
                                .joined(separator: " às ")
                            InfoRowView(icon: "calendar", label: "Reunião", value: meetingStr)
                        }
                        if let address = lifeGroup.address {
                            InfoRowView(icon: "mappin.circle.fill", label: "Endereço", value: address)
                        }
                    }
                    .padding(PazSpacing.lg)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(PazColors.surface)
                    .cornerRadius(16)

                    Spacer().frame(height: PazSpacing.xl)
                }
                .padding(.horizontal, PazSpacing.lg)
            }
            .background(PazColors.background)

            NavigationLink(destination: MeetingReportView(
                formsRepository: IosAppContainer.shared.formsRepository,
                authRepository: IosAppContainer.shared.authRepository
            )) {
                Text("Relatório de Reunião")
                    .font(PazTypography.titleMedium)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                    .background(PazColors.primary)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .padding(.horizontal, PazSpacing.lg)
            .padding(.vertical, PazSpacing.md)
            .background(PazColors.background)
        }
        .background(PazColors.background)
        .navigationTitle(lifeGroup.name)
        .navigationBarTitleDisplayMode(.large)
    }
}

// MARK: - Components

private struct InfoRowView: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        HStack(spacing: PazSpacing.md) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(PazColors.primary)
                .frame(width: 20)
            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(PazTypography.labelSmall)
                    .foregroundColor(.gray)
                Text(value)
                    .font(PazTypography.bodySmall)
            }
            Spacer()
        }
    }
}

#Preview {
    MinistryDetailView(ministry: Ministry(
        id: "1",
        name: "Ministério de Louvor",
        description: "Equipe responsável pela música e adoração nos cultos da igreja.",
        imageUrl: nil
    ))
}
