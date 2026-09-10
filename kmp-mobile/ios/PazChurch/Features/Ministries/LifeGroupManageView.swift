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

    static let weekdays = [
        "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
        "Quinta-feira", "Sexta-feira", "Sábado",
    ]

    @State private var name: String
    @State private var location: String
    @State private var meetingDay: String
    @State private var meetingTime: Date
    @State private var kidsCount: String
    @State private var members: [LifeGroupMember]
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showAddMember = false
    @State private var showAddressEditor = false

    // CEP-based address entry: the leader looks up the street/neighborhood/
    // city/state from the postal code and only types the house number and
    // complement, instead of freely typing the whole address. Existing
    // groups keep their current `location` string until a new CEP is
    // looked up (there's no reliable way to decompose free-text addresses
    // already on file back into CEP/número/complemento).
    @State private var cep = ""
    @State private var addressNumber = ""
    @State private var addressComplement = ""
    @State private var resolvedStreet: String?
    @State private var resolvedNeighborhood: String?
    @State private var resolvedCity: String?
    @State private var resolvedState: String?
    @State private var isLookingUpCep = false
    @State private var cepError: String?

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
        _meetingDay = State(initialValue: lifeGroup.meetingDay ?? LifeGroupManageView.weekdays[0])
        _meetingTime = State(initialValue: Self.parseTime(lifeGroup.meetingTime))
        _kidsCount = State(initialValue: "\(lifeGroup.kidsCount)")
        _members = State(initialValue: lifeGroup.members ?? [])

        // Neighborhood/city/state are already reliable, backend-geocoded
        // fields — use them directly instead of re-deriving from `location`.
        // Street/number/complement aren't stored separately, so they're
        // best-effort parsed from the composed `location` string (which
        // this same editor writes as "street, number[, complement],
        // neighborhood, city, state, cep"). CEP itself isn't persisted
        // anywhere, so it starts blank — the leader only needs to retype it
        // if they want to change the address.
        if let city = lifeGroup.city, let neighborhood = lifeGroup.neighborhood, let state = lifeGroup.state {
            let parsed = Self.parseLocationParts(lifeGroup.location)
            _resolvedStreet = State(initialValue: parsed.street)
            _resolvedNeighborhood = State(initialValue: neighborhood)
            _resolvedCity = State(initialValue: city)
            _resolvedState = State(initialValue: state)
            _addressNumber = State(initialValue: parsed.number)
            _addressComplement = State(initialValue: parsed.complement)
        }
    }

    private static func parseLocationParts(_ location: String?) -> (street: String?, number: String, complement: String) {
        guard let location, !location.isEmpty else { return (nil, "", "") }
        let parts = location.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
        guard let street = parts.first else { return (nil, "", "") }
        let number = (parts.count > 1 && parts[1].allSatisfy(\.isNumber)) ? parts[1] : ""
        // "street, number, complement, neighborhood, city, state, cep" has 7
        // parts when a complement is present; without one there are 6.
        let complement = parts.count == 7 ? parts[2] : ""
        return (street, number, complement)
    }

    private static func parseTime(_ value: String?) -> Date {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        for format in ["HH:mm:ss", "HH:mm"] {
            formatter.dateFormat = format
            if let value, let date = formatter.date(from: value) { return date }
        }
        return Calendar.current.date(bySettingHour: 19, minute: 30, second: 0, of: Date()) ?? Date()
    }

    private var meetingTimeString: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "HH:mm:ss"
        return formatter.string(from: meetingTime)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Informações do grupo") {
                    LabeledRow("Nome") { TextField("Nome do grupo", text: $name) }

                    Button(action: { showAddressEditor = true }) {
                        LabeledRow("Endereço") {
                            Text(location.isEmpty ? "Adicionar endereço" : location)
                                .foregroundColor(location.isEmpty ? .gray : .primary)
                                .lineLimit(1)
                                .truncationMode(.tail)
                            Image(systemName: "chevron.right")
                                .font(.system(size: 13))
                                .foregroundColor(.gray)
                        }
                    }
                    .buttonStyle(.plain)

                    LabeledRow("Dia da reunião") {
                        Picker("", selection: $meetingDay) {
                            ForEach(Self.weekdays, id: \.self) { day in
                                Text(day).tag(day)
                            }
                        }
                        .pickerStyle(.menu)
                        .labelsHidden()
                    }
                    LabeledRow("Horário") {
                        DatePicker("", selection: $meetingTime, displayedComponents: .hourAndMinute)
                            .labelsHidden()
                    }
                    LabeledRow("Quantidade de crianças") {
                        TextField("0", text: $kidsCount)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                    }
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
            .sheet(isPresented: $showAddressEditor) {
                AddressEditSheet(
                    currentLocation: location,
                    cep: $cep,
                    addressNumber: $addressNumber,
                    addressComplement: $addressComplement,
                    resolvedStreet: $resolvedStreet,
                    resolvedNeighborhood: $resolvedNeighborhood,
                    resolvedCity: $resolvedCity,
                    resolvedState: $resolvedState,
                    isLookingUpCep: $isLookingUpCep,
                    cepError: $cepError,
                    onLookupCep: lookupCep,
                    onDone: { recomputeLocation() }
                )
            }
        }
    }

    /// Rebuilds the free-text `location` string sent to the backend from the
    /// CEP-resolved street/neighborhood/city/state plus the leader-entered
    /// número/complemento, once a CEP has actually been looked up.
    private func recomputeLocation() {
        guard let street = resolvedStreet, let neighborhood = resolvedNeighborhood,
              let city = resolvedCity, let state = resolvedState
        else { return }
        var parts = [street]
        if !addressNumber.isEmpty { parts[0] += ", \(addressNumber)" }
        if !addressComplement.isEmpty { parts.append(addressComplement) }
        parts.append(contentsOf: [neighborhood, "\(city), \(state)"])
        if !cep.isEmpty { parts.append(cep) }
        location = parts.joined(separator: ", ")
    }

    private func lookupCep(_ digits: String) async {
        isLookingUpCep = true
        cepError = nil
        defer { isLookingUpCep = false }
        guard let url = URL(string: "https://viacep.com.br/ws/\(digits)/json/") else { return }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let result = try JSONDecoder().decode(ViaCepResponse.self, from: data)
            if result.erro == true {
                cepError = "CEP não encontrado."
                resolvedStreet = nil
                return
            }
            resolvedStreet = result.logradouro
            resolvedNeighborhood = result.bairro
            resolvedCity = result.localidade
            resolvedState = result.uf
            recomputeLocation()
        } catch {
            cepError = "Não foi possível consultar o CEP."
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
                    meetingTime: meetingTimeString,
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

/// A Settings-style form row: a persistent label on the left, the control
/// on the right. Plain `TextField("label", text:)` only shows its label as
/// a placeholder, which disappears once the user types anything — leaving
/// no indication of what the field is for.
/// Full address entry, presented as a sheet from a single "Endereço" summary
/// row on the main form. Typing a CEP re-resolves rua/bairro/cidade/estado
/// and updates every field; número/complemento stay whatever the leader
/// typed across CEP changes.
private struct AddressEditSheet: View {
    let currentLocation: String
    @Binding var cep: String
    @Binding var addressNumber: String
    @Binding var addressComplement: String
    @Binding var resolvedStreet: String?
    @Binding var resolvedNeighborhood: String?
    @Binding var resolvedCity: String?
    @Binding var resolvedState: String?
    @Binding var isLookingUpCep: Bool
    @Binding var cepError: String?
    let onLookupCep: (String) async -> Void
    let onDone: () -> Void

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    LabeledRow("CEP") {
                        TextField("00000-000", text: $cep)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                            .onChange(of: cep) { _, newValue in
                                let digits = String(newValue.filter(\.isNumber).prefix(8))
                                if digits != newValue { cep = digits }
                                if digits.count == 8 { Task { await onLookupCep(digits) } }
                            }
                    }
                    if isLookingUpCep {
                        HStack { Spacer(); ProgressView(); Spacer() }
                    }
                    if let cepError {
                        Text(cepError).font(PazTypography.bodySmall).foregroundColor(.red)
                    }
                    if let resolvedStreet {
                        LabeledRow("Rua") { Text(resolvedStreet).foregroundColor(.gray) }
                    }
                    if let resolvedNeighborhood {
                        LabeledRow("Bairro") { Text(resolvedNeighborhood).foregroundColor(.gray) }
                    }
                    if let resolvedCity, let resolvedState {
                        LabeledRow("Cidade") { Text("\(resolvedCity) - \(resolvedState)").foregroundColor(.gray) }
                    }
                    LabeledRow("Número") {
                        TextField("Número", text: $addressNumber)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                    }
                    LabeledRow("Complemento") {
                        TextField("Bloco, casa, etc. (opcional)", text: $addressComplement)
                            .multilineTextAlignment(.trailing)
                    }
                    if resolvedStreet == nil, !currentLocation.isEmpty {
                        LabeledRow("Endereço atual") { Text(currentLocation).foregroundColor(.gray) }
                    }
                } footer: {
                    Text("Digite o CEP para preencher rua, bairro e cidade automaticamente. Depois, informe apenas o número e complemento.")
                }
            }
            .navigationTitle("Endereço")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Concluir") {
                        onDone()
                        dismiss()
                    }
                }
            }
        }
    }
}

private struct LabeledRow<Content: View>: View {
    let label: String
    @ViewBuilder let content: Content

    init(_ label: String, @ViewBuilder content: () -> Content) {
        self.label = label
        self.content = content()
    }

    var body: some View {
        HStack {
            Text(label).foregroundColor(.gray)
            Spacer()
            content
        }
    }
}

private struct ViaCepResponse: Decodable {
    let logradouro: String?
    let bairro: String?
    let localidade: String?
    let uf: String?
    let erro: Bool?
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
            Group {
                if query.isEmpty {
                    ContentUnavailableView(
                        "Add member to Life Group",
                        systemImage: "person.badge.plus",
                        description: Text("Digite o nome ou email de um membro da igreja para adicioná-lo a este Life Group.")
                    )
                } else if results.isEmpty, !isSearching {
                    ContentUnavailableView.search(text: query)
                } else {
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
        results = (try? await formsRepository.searchUsers(query: text)) ?? []
        isSearching = false
    }
}
