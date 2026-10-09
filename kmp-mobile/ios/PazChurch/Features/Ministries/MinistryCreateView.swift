import Shared
import SwiftUI

/// Reads the actual HTTP status code off a repository failure (bridged from Ktor's
/// `ClientRequestException` via `httpStatusCodeOrNull()` in the shared module), instead of
/// string-matching on `localizedDescription`, which is fragile. Mirrors the pattern in
/// `LifeGroupStudyViewModels.swift`.
private extension Error {
    var httpStatusCode: Int? {
        guard let kotlinException = (self as NSError).kotlinException as? KotlinThrowable else { return nil }
        return kotlinException.httpStatusCodeOrNull()?.intValue
    }
}

/// Maps a repository failure to a user-facing message, checking the actual HTTP status
/// code (rather than string-matching on `localizedDescription`) for the permission case.
private func friendlyErrorMessage(_ error: Error, forbiddenMessage: String) -> String {
    error.httpStatusCode == 403 ? forbiddenMessage : error.localizedDescription
}

/// Leader/admin-only "create ministry" flow. Reachable only from
/// MinistriesView's "+" toolbar button, which is itself gated on
/// `canManage` (mirrors MinistryDetailView's leadership check) — backend
/// still enforces authorization via RolesGuard regardless.
struct MinistryCreateView: View {
    let churchRepository: ChurchRepository
    let formsRepository: FormsRepository
    var onCreated: (Ministry) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var description = ""
    @State private var membershipMode = "teams"

    @State private var leader: Shared.User?
    @State private var coLeader: Shared.User?
    @State private var showLeaderPicker = false
    @State private var showCoLeaderPicker = false

    @State private var isSaving = false
    @State private var errorMessage: String?

    private var canSubmit: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty && leader != nil && !isSaving
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Informações do ministério") {
                    TextField("Nome", text: $name)
                    TextField("Descrição (opcional)", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                }

                Section("Liderança") {
                    Button(action: { showLeaderPicker = true }) {
                        HStack {
                            Text("Líder")
                            Spacer()
                            Text(leader?.name ?? "Selecionar")
                                .foregroundColor(leader == nil ? PazColors.slate : PazColors.ink)
                        }
                    }
                    Button(action: { showCoLeaderPicker = true }) {
                        HStack {
                            Text("Co-líder (opcional)")
                            Spacer()
                            Text(coLeader?.name ?? "Selecionar")
                                .foregroundColor(coLeader == nil ? PazColors.slate : PazColors.ink)
                        }
                    }
                }

                Section("Forma de participação") {
                    Picker("Participação", selection: $membershipMode) {
                        Text("Equipes").tag("teams")
                        Text("Membros diretos").tag("direct")
                    }
                    .pickerStyle(.segmented)
                }

                if let errorMessage {
                    Text(errorMessage)
                        .font(PazTypography.bodySmall)
                        .foregroundColor(PazColors.error)
                }
            }
            .navigationTitle("Novo ministério")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if isSaving {
                        ProgressView()
                    } else {
                        Button("Criar") { Task { await save() } }
                            .disabled(!canSubmit)
                    }
                }
            }
            .sheet(isPresented: $showLeaderPicker) {
                MinistryUserSearchView(formsRepository: formsRepository) { user in
                    leader = user
                }
            }
            .sheet(isPresented: $showCoLeaderPicker) {
                MinistryUserSearchView(formsRepository: formsRepository) { user in
                    coLeader = user
                }
            }
        }
    }

    private func save() async {
        guard let leader else { return }
        guard let leaderIdInt = Int32(leader.id) else {
            errorMessage = "Não foi possível identificar o líder selecionado. Tente selecionar novamente."
            return
        }
        isSaving = true
        errorMessage = nil
        do {
            let created = try await churchRepository.createMinistry(
                request: CreateMinistryRequest(
                    name: name,
                    description: description.isEmpty ? nil : description,
                    leaderId: leaderIdInt,
                    coLeaderId: coLeader.flatMap { Int32($0.id) }.map { KotlinInt(value: $0) },
                    membershipMode: membershipMode
                )
            )
            onCreated(created)
            dismiss()
        } catch {
            errorMessage = friendlyErrorMessage(
                error,
                forbiddenMessage: "Você não tem permissão para criar ministérios."
            )
        }
        isSaving = false
    }
}

/// Minimal self-contained user search picker — duplicated rather than
/// extracted out of `AddMinistryMemberView` in MinistryManageView.swift to
/// avoid risking that existing view's behavior, per plan.
private struct MinistryUserSearchView: View {
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
            .navigationTitle("Selecionar pessoa")
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

#Preview {
    MinistryCreateView(
        churchRepository: IosAppContainer.shared.churchRepository,
        formsRepository: IosAppContainer.shared.formsRepository
    ) { _ in }
}
