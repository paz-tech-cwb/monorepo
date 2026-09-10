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

    /// No single-ministry fetch endpoint exists on the client yet, so refresh
    /// re-fetches the full list and picks this ministry back out by id.
    private func refresh() async {
        guard let refreshed = try? await IosAppContainer.shared.churchRepository.getAllMinistries()
            .first(where: { $0.id == ministry.id })
        else { return }
        ministry = refreshed
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: PazSpacing.lg) {
                Spacer().frame(height: PazSpacing.lg)

                ZStack {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(PazColors.accent.opacity(0.12))
                        .frame(width: 72, height: 72)
                    Image(systemName: "person.3.fill")
                        .font(.system(size: 28))
                        .foregroundColor(PazColors.accent)
                }

                Text(ministry.name)
                    .font(PazTypography.headlineSmall)

                if let description = ministry.description_ {
                    GlassCard(radius: PazSpacing.cardRadiusCompact) {
                        VStack(alignment: .leading, spacing: PazSpacing.sm) {
                            Text("Sobre")
                                .font(PazTypography.titleSmall)
                            Text(description)
                                .font(PazTypography.bodySmall)
                                .foregroundColor(.gray)
                        }
                        .padding(PazSpacing.lg)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }

                // Members are visible to everyone (per spec: any member can see
                // who's in each ministry), but only leaders/admin can manage
                // the roster — see the gear button in the toolbar.
                // Pushed to its own screen rather than listed inline — a
                // ministry can have well over 10 members.
                NavigationLink {
                    GroupMembersListView(
                        title: ministry.name,
                        members: ministry.members.map { GroupMemberItem(id: Int($0.id), name: $0.name) }
                    )
                } label: {
                    HStack(spacing: PazSpacing.md) {
                        Text("Membros")
                            .font(PazTypography.titleSmall)
                            .foregroundColor(PazColors.ink)
                        Spacer()
                        Text("\(ministry.members.count)")
                            .font(PazTypography.labelSmall)
                            .foregroundColor(.gray)
                        Image(systemName: "chevron.right")
                            .font(.system(size: 14))
                            .foregroundColor(.gray)
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .padding(PazSpacing.lg)
                .frame(maxWidth: .infinity, alignment: .leading)
                .glassCard(radius: PazSpacing.cardRadiusCompact)

                Spacer().frame(height: PazSpacing.xl)
            }
            .padding(.horizontal, PazSpacing.lg)
        }
        .refreshable { await refresh() }
        .background(PazMeshBackground())
        .navigationTitle(ministry.name)
        .navigationBarTitleDisplayMode(.large)
        .toolbarBackground(.hidden, for: .navigationBar)
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
    @State private var showLeadershipPicker = false

    init(lifeGroup: LifeGroup) {
        _lifeGroup = State(initialValue: lifeGroup)
    }

    private struct LeadershipContact {
        let name: String
        let phone: String
    }

    private var leadershipContacts: [LeadershipContact] {
        var contacts: [LeadershipContact] = []
        if let leader = lifeGroup.leader, let phone = lifeGroup.leaderPhone {
            contacts.append(LeadershipContact(name: leader, phone: phone))
        }
        if let coLeader = lifeGroup.coLeaderName, let phone = lifeGroup.coLeaderPhone {
            contacts.append(LeadershipContact(name: coLeader, phone: phone))
        }
        return contacts
    }

    /// No single-life-group fetch endpoint exists on the client yet, so
    /// refresh re-fetches the full list and picks this group back out by id.
    private func refresh() async {
        guard let refreshed = try? await IosAppContainer.shared.churchRepository.getAllLifeGroups()
            .first(where: { $0.id == lifeGroup.id })
        else { return }
        lifeGroup = refreshed
    }

    private func talkToLeadershipTapped() {
        guard leadershipContacts.count > 1 else {
            if let only = leadershipContacts.first { openWhatsApp(phone: only.phone) }
            return
        }
        showLeadershipPicker = true
    }

    private func openWhatsApp(phone: String) {
        let digits = phone.filter(\.isNumber)
        guard !digits.isEmpty, let url = URL(string: "https://wa.me/\(digits)") else { return }
        UIApplication.shared.open(url)
    }

    /// Matches the backend's actual authorization (RolesGuard checks any
    /// leadership role, not specifically this group's own leader) — the
    /// app only needs to decide when to show the entry point.
    private var canManage: Bool {
        authCoordinator.currentUser?.role.isLeader == true
    }

    /// Attendance has no dedicated role slug for co-leaders, so unlike
    /// `canManage` (any leadership role) this checks the current user's id
    /// against this specific group's leader_id/co_leader_id.
    private var canManageAttendance: Bool {
        guard let userId = authCoordinator.currentUser.flatMap({ Int32($0.id) }) else { return false }
        return lifeGroup.leaderId?.int32Value == userId || lifeGroup.coLeaderId?.int32Value == userId
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: PazSpacing.lg) {
                    Spacer().frame(height: PazSpacing.lg)

                    HStack(spacing: PazSpacing.lg) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 16)
                                .fill(PazColors.accent.opacity(0.12))
                                .frame(width: 72, height: 72)
                            Image(systemName: "person.fill")
                                .font(.system(size: 28))
                                .foregroundColor(PazColors.accent)
                        }
                        VStack(alignment: .leading, spacing: PazSpacing.xs) {
                            Text(lifeGroup.name)
                                .font(PazTypography.headlineSmall)
                            Text("\(lifeGroup.membersCount) membros")
                                .font(PazTypography.labelSmall)
                                .foregroundColor(PazColors.accent)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 4)
                                .background(PazColors.accent.opacity(0.12))
                                .cornerRadius(20)
                        }
                    }

                    GlassCard(radius: PazSpacing.cardRadiusCompact) {
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
                                            .foregroundColor(PazColors.accent)
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
                    }

                    if !leadershipContacts.isEmpty {
                        Button(action: talkToLeadershipTapped) {
                            HStack(spacing: PazSpacing.md) {
                                Image(systemName: "message.fill")
                                    .font(.system(size: 18))
                                    .foregroundColor(PazColors.accent)
                                Text("Falar com a liderança")
                                    .font(PazTypography.titleSmall)
                                    .foregroundColor(PazColors.ink)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 14))
                                    .foregroundColor(.gray)
                            }
                            .padding(PazSpacing.lg)
                            .glassCard(radius: PazSpacing.cardRadiusCompact)
                        }
                        .buttonStyle(.plain)
                        .confirmationDialog(
                            "Falar com a liderança",
                            isPresented: $showLeadershipPicker,
                            titleVisibility: .visible
                        ) {
                            ForEach(leadershipContacts, id: \.phone) { contact in
                                Button(contact.name) { openWhatsApp(phone: contact.phone) }
                            }
                        }
                    }

                    if let members = lifeGroup.members {
                        // Pushed to its own screen rather than listed inline —
                        // a life group can have well over 10 members.
                        NavigationLink {
                            GroupMembersListView(
                                title: lifeGroup.name,
                                members: members.map { GroupMemberItem(id: Int($0.id), name: $0.name) }
                            )
                        } label: {
                            HStack(spacing: PazSpacing.md) {
                                Text("Membros")
                                    .font(PazTypography.titleSmall)
                                    .foregroundColor(PazColors.ink)
                                Spacer()
                                Text("\(members.count)")
                                    .font(PazTypography.labelSmall)
                                    .foregroundColor(.gray)
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 14))
                                    .foregroundColor(.gray)
                            }
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .padding(PazSpacing.lg)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .glassCard(radius: PazSpacing.cardRadiusCompact)
                    }

                    // `members` is only populated when the backend has already
                    // decided this viewer may see this group's roster (leadership,
                    // this group's leader/co-leader, or a member) — the same
                    // population that grants access to its study content, so it
                    // doubles as a cheap proxy without an extra request. Non-members
                    // never see this entry point, so they can't hit the dead-end
                    // permission error.
                    if lifeGroup.members != nil {
                        NavigationLink {
                            LifeGroupStudyListView(repository: IosAppContainer.shared.lifeGroupStudyRepository)
                        } label: {
                            HStack(spacing: PazSpacing.md) {
                                Image(systemName: "book.fill")
                                    .font(.system(size: 18))
                                    .foregroundColor(PazColors.accent)
                                Text("Estudo do Life")
                                    .font(PazTypography.titleSmall)
                                    .foregroundColor(PazColors.ink)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 14))
                                    .foregroundColor(.gray)
                            }
                            .padding(PazSpacing.lg)
                            .glassCard(radius: PazSpacing.cardRadiusCompact)
                        }
                        .buttonStyle(.plain)
                    }

                    if canManageAttendance {
                        NavigationLink {
                            LifeGroupAttendanceHistoryView(
                                lifeGroupId: Int32(lifeGroup.id),
                                meetingDay: lifeGroup.meetingDay,
                                repository: IosAppContainer.shared.lifeGroupAttendanceRepository
                            )
                        } label: {
                            HStack(spacing: PazSpacing.md) {
                                Image(systemName: "checklist")
                                    .font(.system(size: 18))
                                    .foregroundColor(PazColors.accent)
                                Text("Presença")
                                    .font(PazTypography.titleSmall)
                                    .foregroundColor(PazColors.ink)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 14))
                                    .foregroundColor(.gray)
                            }
                            .padding(PazSpacing.lg)
                            .glassCard(radius: PazSpacing.cardRadiusCompact)
                        }
                        .buttonStyle(.plain)
                    }

                    if canManage || canManageAttendance {
                        NavigationLink {
                            LifeGroupAnalyticsView(
                                lifeGroupId: Int32(lifeGroup.id),
                                lifeGroupName: lifeGroup.name,
                                analyticsRepository: IosAppContainer.shared.lifeGroupAnalyticsRepository
                            )
                        } label: {
                            HStack(spacing: PazSpacing.md) {
                                Image(systemName: "chart.bar.fill")
                                    .font(.system(size: 18))
                                    .foregroundColor(PazColors.accent)
                                Text("Relatórios")
                                    .font(PazTypography.titleSmall)
                                    .foregroundColor(PazColors.ink)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 14))
                                    .foregroundColor(.gray)
                            }
                            .padding(PazSpacing.lg)
                            .glassCard(radius: PazSpacing.cardRadiusCompact)
                        }
                        .buttonStyle(.plain)
                    }

                    Spacer().frame(height: PazSpacing.xl)
                }
                .padding(.horizontal, PazSpacing.lg)
            }
        }
        .refreshable { await refresh() }
        .background(PazMeshBackground())
        .navigationTitle(lifeGroup.name)
        .navigationBarTitleDisplayMode(.large)
        .toolbarBackground(.hidden, for: .navigationBar)
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

// MARK: - Members list (pushed screen)

struct GroupMemberItem: Identifiable {
    let id: Int
    let name: String
}

struct GroupMembersListView: View {
    let title: String
    let members: [GroupMemberItem]
    @State private var query = ""

    private var filtered: [GroupMemberItem] {
        guard !query.isEmpty else { return members }
        return members.filter { $0.name.localizedCaseInsensitiveContains(query) }
    }

    var body: some View {
        Group {
            if members.isEmpty {
                ContentUnavailableView(
                    "Nenhum membro cadastrado ainda.",
                    systemImage: "person.2"
                )
            } else {
                List(filtered) { member in
                    HStack(spacing: PazSpacing.md) {
                        Image(systemName: "person.fill")
                            .foregroundStyle(PazColors.accent)
                        Text(member.name)
                            .font(PazTypography.bodyMedium)
                            .foregroundStyle(PazColors.ink)
                        Spacer()
                    }
                    .padding(PazSpacing.md)
                    .glassCard(radius: PazSpacing.cardRadiusCompact)
                    .listRowSeparator(.hidden)
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets(top: 6, leading: PazSpacing.lg, bottom: 6, trailing: PazSpacing.lg))
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .searchable(text: $query, prompt: "Buscar membro")
            }
        }
        .background(PazMeshBackground())
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.hidden, for: .navigationBar)
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
                .foregroundColor(PazColors.accent)
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
