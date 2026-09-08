import Shared
import SwiftUI

/// Leader/admin-only life group management — edit group info and add/remove
/// members. Backend enforces the actual authorization (RolesGuard on the
/// underlying endpoints); this view is only reachable when
/// LifeGroupDetailView already decided the current user is a leader/admin.
struct LifeGroupManageView: View {
    let lifeGroup: LifeGroup
    let churchRepository: ChurchRepository
    let formsRepository: FormsRepository
    var onSaved: (LifeGroup) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var name: String
    @State private var location: String
    @State private var meetingDay: String
    @State private var meetingTime: String
    @State private var kidsCount: String
    @State private var members: [LifeGroupMember]
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showAddMember = false

    init(
        lifeGroup: LifeGroup,
        churchRepository: ChurchRepository,
        formsRepository: FormsRepository,
        onSaved: @escaping (LifeGroup) -> Void
    ) {
        self.lifeGroup = lifeGroup
        self.churchRepository = churchRepository
        self.formsRepository = formsRepository
        self.onSaved = onSaved
        _name = State(initialValue: lifeGroup.name)
        _location = State(initialValue: lifeGroup.location ?? "")
        _meetingDay = State(initialValue: lifeGroup.meetingDay ?? "")
        _meetingTime = State(initialValue: lifeGroup.meetingTime ?? "")
        _kidsCount = State(initialValue: "\(lifeGroup.kidsCount)")
        _members = State(initialValue: lifeGroup.members ?? [])
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Informações do grupo") {
                    TextField("Nome", text: $name)
                    TextField("Endereço", text: $location)
                    TextField("Dia da reunião (ex: Quinta)", text: $meetingDay)
                    TextField("Horário (ex: 19:30)", text: $meetingTime)
                    TextField("Quantidade de crianças", text: $kidsCount)
                        .keyboardType(.numberPad)
                }

                Section("Membros") {
                    ForEach(members, id: \.id) { member in
                        Text(member.name)
                    }
                    .onDelete(perform: removeMembers)

                    Button(action: { showAddMember = true }) {
                        Label("Adicionar membro", systemImage: "person.badge.plus")
                    }
                }

                if let errorMessage {
                    Text(errorMessage)
                        .font(PazTypography.bodySmall)
                        .foregroundColor(.red)
                }
            }
            .navigationTitle("Gerenciar grupo")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Salvar") { Task { await save() } }
                        .disabled(isSaving || name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .sheet(isPresented: $showAddMember) {
                AddLifeGroupMemberView(formsRepository: formsRepository) { user in
                    Task { await addMember(userId: user.id, name: user.name) }
                }
            }
        }
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        do {
            let updated = try await churchRepository.updateLifeGroup(
                id: Int32(lifeGroup.id),
                request: UpdateLifeGroupRequest(
                    name: name,
                    location: location.isEmpty ? nil : location,
                    meetingDay: meetingDay.isEmpty ? nil : meetingDay,
                    meetingTime: meetingTime.isEmpty ? nil : meetingTime,
                    kidsCount: Int32(kidsCount).map { KotlinInt(value: $0) }
                )
            )
            onSaved(updated)
            dismiss()
        } catch {
            errorMessage = "Erro ao salvar. Tente novamente."
        }
        isSaving = false
    }

    private func addMember(userId: String, name: String) async {
        guard let userIdInt = Int32(userId) else { return }
        do {
            try await churchRepository.addLifeGroupMember(lifeGroupId: Int32(lifeGroup.id), userId: userIdInt)
            members.append(LifeGroupMember(id: userIdInt, name: name, email: ""))
        } catch {
            errorMessage = "Erro ao adicionar membro."
        }
    }

    private func removeMembers(at offsets: IndexSet) {
        let toRemove = offsets.map { members[$0] }
        members.remove(atOffsets: offsets)
        Task {
            for member in toRemove {
                try? await churchRepository.removeLifeGroupMember(lifeGroupId: Int32(lifeGroup.id), userId: member.id)
            }
        }
    }
}

private struct AddLifeGroupMemberView: View {
    let formsRepository: FormsRepository
    var onSelect: (Shared.User) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    @State private var results: [Shared.User] = []
    @State private var isSearching = false

    var body: some View {
        NavigationStack {
            List(results, id: \.id) { user in
                Button(action: {
                    onSelect(user)
                    dismiss()
                }) {
                    VStack(alignment: .leading) {
                        Text(user.name)
                        Text(user.email).font(PazTypography.labelSmall).foregroundColor(.gray)
                    }
                }
            }
            .searchable(text: $query, prompt: "Buscar por nome ou email")
            .onChange(of: query) { _, newValue in
                Task { await search(newValue) }
            }
            .navigationTitle("Adicionar membro")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { dismiss() }
                }
            }
        }
    }

    private func search(_ text: String) async {
        guard text.count >= 2 else {
            results = []
            return
        }
        isSearching = true
        results = await (try? formsRepository.searchUsers(query: text)) ?? []
        isSearching = false
    }
}
