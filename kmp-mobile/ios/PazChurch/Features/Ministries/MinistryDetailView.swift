import Shared
import SwiftUI
import UIKit

// MARK: - Ministry Detail

struct MinistryDetailView: View {
    @State private var ministry: Ministry
    @Environment(AuthenticationCoordinator.self) private var authCoordinator
    @State private var showManage = false

    init(ministry: Ministry) {
        _ministry = State(initialValue: ministry)
    }

    private var canManage: Bool {
        authCoordinator.currentUser?.role.isLeader == true
    }

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

                // Members are visible to everyone (per spec: any member can see
                // who's in each ministry), but only leaders/admin can manage
                // the roster — see the gear button in the toolbar.
                VStack(alignment: .leading, spacing: PazSpacing.sm) {
                    Text("Membros")
                        .font(PazTypography.titleSmall)
                    if ministry.members.isEmpty {
                        Text("Nenhum membro cadastrado ainda.")
                            .font(PazTypography.bodySmall)
                            .foregroundColor(.gray)
                    } else {
                        ForEach(ministry.members, id: \.id) { member in
                            Text(member.name)
                                .font(PazTypography.bodySmall)
                        }
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
        .navigationTitle(ministry.name)
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            if canManage {
                ToolbarItem(placement: .primaryAction) {
                    Button(action: { showManage = true }) {
                        Image(systemName: "gearshape.fill")
                    }
                }
            }
        }
        .sheet(isPresented: $showManage) {
            MinistryManageView(
                ministry: ministry,
                churchRepository: IosAppContainer.shared.churchRepository,
                formsRepository: IosAppContainer.shared.formsRepository
            ) { updated in
                ministry = updated
            }
        }
    }
}

// MARK: - Life Group Detail

struct LifeGroupDetailView: View {
    @State private var lifeGroup: LifeGroup
    @Environment(AuthenticationCoordinator.self) private var authCoordinator
    @State private var showManage = false

    init(lifeGroup: LifeGroup) {
        _lifeGroup = State(initialValue: lifeGroup)
    }

    // Matches the backend's actual authorization (RolesGuard checks any
    // leadership role, not specifically this group's own leader) — the
    // app only needs to decide when to show the entry point.
    private var canManage: Bool {
        authCoordinator.currentUser?.role.isLeader == true
    }

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
                        if let location = lifeGroup.location, !location.isEmpty {
                            InfoRowView(icon: "mappin.circle.fill", label: "Endereço", value: location)
                            if lifeGroup.latitude != nil, lifeGroup.longitude != nil {
                                Button(action: openInMaps) {
                                    Text("Como chegar")
                                        .font(PazTypography.labelSmall)
                                        .foregroundColor(PazColors.primary)
                                }
                                .padding(.leading, 32)
                            }
                        }
                        if lifeGroup.kidsCount > 0 {
                            InfoRowView(
                                icon: "figure.2.and.child.holdinghands",
                                label: "Crianças",
                                value: "\(lifeGroup.kidsCount)"
                            )
                        }
                    }
                    .padding(PazSpacing.lg)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(PazColors.surface)
                    .cornerRadius(16)

                    if lifeGroup.leaderPhone != nil || lifeGroup.coLeaderPhone != nil {
                        VStack(alignment: .leading, spacing: PazSpacing.md) {
                            Text("Falar com a liderança")
                                .font(PazTypography.titleSmall)
                            if let leader = lifeGroup.leader, let phone = lifeGroup.leaderPhone {
                                WhatsAppButton(name: leader, phone: phone)
                            }
                            if let coLeader = lifeGroup.coLeaderName, let phone = lifeGroup.coLeaderPhone {
                                WhatsAppButton(name: coLeader, phone: phone)
                            }
                        }
                        .padding(PazSpacing.lg)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(PazColors.surface)
                        .cornerRadius(16)
                    }

                    if let members = lifeGroup.members {
                        VStack(alignment: .leading, spacing: PazSpacing.md) {
                            Text("Membros")
                                .font(PazTypography.titleSmall)
                            if members.isEmpty {
                                Text("Nenhum membro cadastrado ainda.")
                                    .font(PazTypography.bodySmall)
                                    .foregroundColor(.gray)
                            } else {
                                ForEach(members, id: \.id) { member in
                                    Text(member.name)
                                        .font(PazTypography.bodySmall)
                                }
                            }
                        }
                        .padding(PazSpacing.lg)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(PazColors.surface)
                        .cornerRadius(16)
                    }

                    NavigationLink {
                        LifeGroupStudyListView(repository: IosAppContainer.shared.lifeGroupStudyRepository)
                    } label: {
                        HStack(spacing: PazSpacing.md) {
                            Image(systemName: "book.fill")
                                .font(.system(size: 18))
                                .foregroundColor(PazColors.primary)
                            Text("Estudo do Life")
                                .font(PazTypography.titleSmall)
                                .foregroundColor(PazColors.ink)
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.system(size: 14))
                                .foregroundColor(.gray)
                        }
                        .padding(PazSpacing.lg)
                        .background(PazColors.surface)
                        .cornerRadius(16)
                    }
                    .buttonStyle(.plain)

                    Spacer().frame(height: PazSpacing.xl)
                }
                .padding(.horizontal, PazSpacing.lg)
            }
            .background(PazColors.background)
        }
        .background(PazColors.background)
        .navigationTitle(lifeGroup.name)
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            if canManage {
                ToolbarItem(placement: .primaryAction) {
                    Button(action: { showManage = true }) {
                        Image(systemName: "gearshape.fill")
                    }
                }
            }
        }
        .sheet(isPresented: $showManage) {
            LifeGroupManageView(
                lifeGroup: lifeGroup,
                churchRepository: IosAppContainer.shared.churchRepository,
                formsRepository: IosAppContainer.shared.formsRepository
            ) { updated in
                lifeGroup = updated
            }
        }
    }

    /// Opens the device's default maps app for turn-by-turn directions —
    /// lets the user pick Apple Maps/Google Maps/Waze via the system sheet
    /// rather than hardcoding one provider.
    private func openInMaps() {
        guard let lat = lifeGroup.latitude, let lng = lifeGroup.longitude else { return }
        let name = lifeGroup.name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? lifeGroup.name
        if let url = URL(string: "maps://?daddr=\(lat),\(lng)&q=\(name)") {
            UIApplication.shared.open(url)
        }
    }
}

// MARK: - Components

private struct WhatsAppButton: View {
    let name: String
    let phone: String

    var body: some View {
        Button(action: openWhatsApp) {
            HStack(spacing: PazSpacing.sm) {
                Image(systemName: "message.fill")
                    .font(.system(size: 14))
                Text("Falar com \(name) no WhatsApp")
                    .font(PazTypography.labelSmall)
            }
            .foregroundColor(.white)
            .padding(.horizontal, PazSpacing.md)
            .padding(.vertical, PazSpacing.sm)
            .background(Color(red: 0.15, green: 0.68, blue: 0.38))
            .cornerRadius(10)
        }
    }

    private func openWhatsApp() {
        let digits = phone.filter(\.isNumber)
        guard !digits.isEmpty, let url = URL(string: "https://wa.me/\(digits)") else { return }
        UIApplication.shared.open(url)
    }
}

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
        id: 1,
        name: "Ministério de Louvor",
        slug: "louvor",
        isPermanent: true,
        description: "Equipe responsável pela música e adoração nos cultos da igreja.",
        membershipMode: "teams",
        leader: MinistryUser(id: 1, name: "João Silva"),
        coLeader: MinistryUser(id: 2, name: "Maria Santos"),
        teams: [],
        members: []
    ))
}
