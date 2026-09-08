import Shared
import SwiftUI

/// Leader/admin-only ministry management — edit name/description and
/// add/remove members. Backend enforces authorization via RolesGuard;
/// this view is only reachable when MinistryDetailView already decided
/// the current user is a leader/admin.
struct MinistryManageView: View {
    let ministry: Ministry
    let churchRepository: ChurchRepository
    let formsRepository: FormsRepository
    var onSaved: (Ministry) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var name: String
    @State private var description: String
    @State private var members: [MinistryUser]
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showAddMember = false

    init(
        ministry: Ministry,
        churchRepository: ChurchRepository,
        formsRepository: FormsRepository,
        onSaved: @escaping (Ministry) -> Void
    ) {
        self.ministry = ministry
        self.churchRepository = churchRepository
        self.formsRepository = formsRepository
        self.onSaved = onSaved
        _name = State(initialValue: ministry.name)
        _description = State(initialValue: ministry.description_ ?? "")
        _members = State(initialValue: ministry.members)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Informações do ministério") {
                    TextField("Nome", text: $name)
                    TextField("Descrição", text: $description, axis: .vertical)
                        .lineLimit(3...6)
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
            .navigationTitle("Gerenciar ministério")
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
                AddMinistryMemberView(formsRepository: formsRepository) { user in
                    Task { await addMember(userId: user.id, name: user.name) }
                }
            }
        }
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        do {
            let updated = try await churchRepository.updateMinistry(
                id: Int32(ministry.id),
                request: UpdateMinistryRequest(name: name, description: description.isEmpty ? nil : description)
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
            try await churchRepository.addMinistryMember(ministryId: Int32(ministry.id), userId: userIdInt)
            members.append(MinistryUser(id: userIdInt, name: name))
        } catch {
            errorMessage = "Erro ao adicionar membro."
        }
    }

    private func removeMembers(at offsets: IndexSet) {
        let toRemove = offsets.map { members[$0] }
        members.remove(atOffsets: offsets)
        Task {
            for member in toRemove {
                try? await churchRepository.removeMinistryMember(ministryId: Int32(ministry.id), userId: member.id)
            }
        }
    }
}

private struct AddMinistryMemberView: View {
    let formsRepository: FormsRepository
    var onSelect: (Shared.User) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    @State private var results: [Shared.User] = []

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
        results = (try? await formsRepository.searchUsers(query: text)) ?? []
    }
}
