import Observation
import Shared
import SwiftUI

// MARK: - Field Definitions

enum FormFieldType {
    case text
    case name
    case phone
    case email
    case date
    case integer
    case currency
    case multiline
    case toggle
    case select          // enum: optionValues[i] = API value, label in options[i] displayed
    case userPicker      // single user → stores id string
    case userMultiPicker // multi user → stores "1,2,3"
    case lgPicker        // life-group → stores id string
    case selfOrSearch    // invited_by: "" = self, else searched name
}

struct FormFieldDef {
    let key: String
    let label: String
    let placeholder: String
    let required: Bool
    let fieldType: FormFieldType
    let options: [String]       // display labels
    let optionValues: [String]  // API values parallel to options; empty = value IS label

    init(
        _ key: String,
        _ label: String,
        placeholder: String = "",
        required: Bool = false,
        fieldType: FormFieldType = .text,
        options: [String] = [],
        optionValues: [String] = []
    ) {
        self.key = key
        self.label = label
        self.placeholder = placeholder
        self.required = required
        self.fieldType = fieldType
        self.options = options
        self.optionValues = optionValues
    }
}

extension FormType {
    var fieldDefs: [FormFieldDef] {
        switch self {
        case .memberRegistration:
            [
                FormFieldDef("name", "Nome Completo", placeholder: "Digite o nome completo", required: true, fieldType: .name),
                FormFieldDef("phone", "Telefone", placeholder: "(41) 9 9999-9999", fieldType: .phone),
                FormFieldDef("email", "E-mail", placeholder: "email@exemplo.com", fieldType: .email),
            ]
        case .conversion:
            [
                FormFieldDef("name", "Nome", placeholder: "Nome do convertido", required: true, fieldType: .name),
                FormFieldDef("phone", "Telefone", placeholder: "(41) 9 9999-9999", fieldType: .phone),
                FormFieldDef("date", "Data da Conversão", placeholder: "DD/MM/YYYY", required: true, fieldType: .date),
                FormFieldDef("observations", "Observações", fieldType: .multiline),
            ]
        case .guest:
            [
                FormFieldDef("name", "Nome do Visitante", placeholder: "Nome completo", required: true, fieldType: .name),
                FormFieldDef("phone", "Telefone", placeholder: "(41) 9 9999-9999", fieldType: .phone),
                FormFieldDef("invited_by", "Convidado por", placeholder: "Nome de quem convidou"),
                FormFieldDef("via_casa_de_paz", "Veio de uma Casa de Paz?", placeholder: "", fieldType: .toggle),
                FormFieldDef("date", "Data da Visita", placeholder: "DD/MM/YYYY", required: true, fieldType: .date),
            ]
        case .multiplication:
            [
                FormFieldDef("new_life_group_name", "Nome do Novo Grupo", placeholder: "Ex: GL Norte", required: true),
                FormFieldDef("date", "Data da Multiplicação", placeholder: "DD/MM/YYYY", required: true, fieldType: .date),
            ]
        case .serviceReport:
            [
                FormFieldDef("date", "Data", placeholder: "DD/MM/YYYY", required: true, fieldType: .date),
                FormFieldDef("report_type", "Tipo de relatório", placeholder: "tadel / culto_celebracao / evento", required: true),
                FormFieldDef("period", "Período", placeholder: "manha / tarde_noite", required: true),
                FormFieldDef("tadel_adults", "Adultos (Tadel)", placeholder: "0", required: true, fieldType: .integer),
                FormFieldDef("tadel_kids", "Crianças (Tadel)", placeholder: "0", fieldType: .integer),
                FormFieldDef("vehicles_cars", "Carros", placeholder: "0", required: true, fieldType: .integer),
                FormFieldDef("vehicles_motos", "Motos", placeholder: "0", fieldType: .integer),
                FormFieldDef("vehicles_bikes", "Bicicletas", placeholder: "0", fieldType: .integer),
                FormFieldDef("vehicles_others", "Outros veículos", placeholder: "Ex: Ônibus - 2"),
                FormFieldDef("volunteers_atmosfera", "Voluntários Atmosfera", placeholder: "0", fieldType: .integer),
                FormFieldDef("volunteers_louvor", "Voluntários Louvor", placeholder: "0", fieldType: .integer),
                FormFieldDef("volunteers_midia", "Voluntários Mídia", placeholder: "0", fieldType: .integer),
                FormFieldDef("volunteers_danca", "Voluntários Dança", placeholder: "0", fieldType: .integer),
                FormFieldDef("notes", "Observação", placeholder: "Ocorrências, materiais...", fieldType: .multiline),
            ]
        case .course:
            [
                FormFieldDef("course_name", "Nome do Curso", placeholder: "Ex: Escola de Membros", required: true),
                FormFieldDef("enrolled_at", "Data de Inscrição", placeholder: "DD/MM/YYYY", required: true, fieldType: .date),
            ]
        case .lifeGroupReport:
            [
                FormFieldDef("date", "Data da Reunião", placeholder: "DD/MM/YYYY", required: true, fieldType: .date),
                FormFieldDef("attendees", "Quantidade de Participantes", placeholder: "0", required: true, fieldType: .integer),
                FormFieldDef("visitors", "Quantidade de Visitantes", placeholder: "0", fieldType: .integer),
                FormFieldDef("offerings", "Oferta (R$)", placeholder: "0,00", fieldType: .currency),
                FormFieldDef("observations", "Observações", fieldType: .multiline),
            ]
        case .sectorSupervisorReport:
            [
                FormFieldDef("date", "Data do Relatório", placeholder: "DD/MM/YYYY", required: true, fieldType: .date),
                FormFieldDef("attendees", "Total de Participantes", placeholder: "0", required: true, fieldType: .integer),
                FormFieldDef("visitors", "Total de Visitantes", placeholder: "0", fieldType: .integer),
                FormFieldDef("offerings", "Total de Ofertas (R$)", placeholder: "0,00", fieldType: .currency),
                FormFieldDef("observations", "Observações", fieldType: .multiline),
            ]
        default: // areaSupervisorReport
            [
                FormFieldDef("date", "Data do Relatório", placeholder: "DD/MM/YYYY", required: true, fieldType: .date),
                FormFieldDef("attendees", "Total de Participantes", placeholder: "0", required: true, fieldType: .integer),
                FormFieldDef("visitors", "Total de Visitantes", placeholder: "0", fieldType: .integer),
                FormFieldDef("offerings", "Total de Ofertas (R$)", placeholder: "0,00", fieldType: .currency),
                FormFieldDef("observations", "Observações", fieldType: .multiline),
            ]
        }
    }

    var displayName: String {
        switch self {
        case .memberRegistration: return "Registro de Membro"
        case .conversion: return "Conversão"
        case .guest: return "Visitante"
        case .multiplication: return "Multiplicação"
        case .serviceReport: return "Relatório de Culto"
        case .course: return "Curso"
        case .lifeGroupReport: return "Relatório de Grupo"
        case .sectorSupervisorReport: return "Rel. Supervisor de Setor"
        default: return "Rel. Supervisor de Área"
        }
    }
}

// MARK: - ViewModel

@MainActor
@Observable
class FormDetailViewModelIOS {
    var form: FormCatalogItem?
    var fields: [String: String] = [:]
    var isLoading = true
    var isSubmitting = false
    var error: String?
    var submitSuccess = false

    // MARK: - Picker state
    var pickerKey: String? = nil
    var pickerLabel: String = ""
    var pickerIsMulti: Bool = false
    var pickerIsLifeGroup: Bool = false
    var pickerQuery: String = ""
    var pickerResults: [Any] = []
    var pickerIsLoading: Bool = false
    var pickerError: String? = nil
    var selfOrSearchModes: [String: Bool] = [:]

    private let formsRepository: FormsRepository
    private let authRepository: AuthRepository
    private let formId: String
    private var currentUserName: String = ""

    init(formId: String, formsRepository: FormsRepository, authRepository: AuthRepository) {
        self.formId = formId
        self.formsRepository = formsRepository
        self.authRepository = authRepository
        loadForm()
    }

    private func loadForm() {
        Task {
            do {
                async let catalogRaw = formsRepository.getCatalog()
                async let user = authRepository.currentUser()
                let (resolvedCatalog, resolvedUser) = try await (catalogRaw, user)
                currentUserName = (resolvedUser as? Shared.User)?.name ?? ""
                let catalog = (resolvedCatalog as? [FormCatalogItem]) ?? []
                guard let found = catalog.first(where: { $0.id == formId }) else {
                    self.error = "Formulário não encontrado"
                    self.isLoading = false
                    return
                }
                self.form = found
                let today = DateFormatter.brazilianDate.string(from: Date())
                self.fields = Dictionary(uniqueKeysWithValues: found.type.fieldDefs.map { def in
                    let initial: String
                    if def.fieldType == .date {
                        initial = today
                    } else {
                        initial = ""
                    }
                    return (def.key, initial)
                })
                self.isLoading = false
            } catch {
                self.error = error.localizedDescription
                self.isLoading = false
            }
        }
    }

    func update(key: String, value: String) {
        fields[key] = value
        error = nil
    }

    func openPicker(def: FormFieldDef) {
        pickerKey = def.key
        pickerLabel = def.label
        pickerIsMulti = def.fieldType == .userMultiPicker
        pickerIsLifeGroup = def.fieldType == .lgPicker
        pickerQuery = ""
        pickerResults = []
        pickerError = nil
    }

    func closePicker() { pickerKey = nil }

    func onPickerQueryChanged(_ query: String) {
        pickerQuery = query
        pickerIsLoading = true
        pickerError = nil
        Task {
            do {
                if pickerIsLifeGroup {
                    let results = try await formsRepository.searchLifeGroups(query: query)
                    pickerResults = results as [Any]
                } else {
                    let results = try await formsRepository.searchUsers(query: query)
                    pickerResults = results as [Any]
                }
                pickerIsLoading = false
            } catch {
                pickerError = error.localizedDescription
                pickerIsLoading = false
            }
        }
    }

    func onPickerSelect(id: String, name: String) {
        guard let key = pickerKey else { return }
        if pickerIsMulti {
            var current = (fields[key] ?? "").split(separator: ",").map(String.init).filter { !$0.isEmpty }
            if current.contains(id) { current.removeAll { $0 == id } } else { current.append(id) }
            fields[key] = current.joined(separator: ",")
        } else {
            fields[key] = id
            fields["\(key)_name"] = name
            closePicker()
        }
    }

    func setSelfOrSearchMode(key: String, isSearch: Bool) {
        selfOrSearchModes[key] = isSearch
        if !isSearch { fields[key] = "" }
    }

    var canSubmit: Bool {
        guard let form else { return false }
        return !isSubmitting && form.type.fieldDefs
            .filter(\.required)
            .allSatisfy { !(fields[$0.key] ?? "").trimmingCharacters(in: .whitespaces).isEmpty }
    }

    func onSubmit() {
        guard let form else { return }

        let missingLabel = form.type.fieldDefs
            .first { $0.required && (fields[$0.key] ?? "").trimmingCharacters(in: .whitespaces).isEmpty }?.label
        if let label = missingLabel {
            error = "\(label) é obrigatório"
            return
        }

        isSubmitting = true
        error = nil

        Task {
            do {
                let userId = try await (authRepository.currentUser() as? Shared.User)?.id ?? ""
                try await submit(type: form.type, userId: userId)
                submitSuccess = true
                isSubmitting = false
            } catch {
                self.error = error.localizedDescription
                isSubmitting = false
            }
        }
    }

    private func submit(type: FormType, userId: String) async throws {
        let snapshot = fields
        func req(_ key: String) -> String {
            snapshot[key]?.trimmingCharacters(in: .whitespaces) ?? ""
        }
        func opt(_ key: String) -> String? {
            let value = snapshot[key]?.trimmingCharacters(in: .whitespaces)
            return value?.isEmpty == false ? value : nil
        }
        func intVal(_ key: String) -> Int32 {
            Int32(snapshot[key]?.trimmingCharacters(in: .whitespaces) ?? "") ?? 0
        }
        func dblVal(_ key: String) -> Double? {
            // Parse BRL formatted string e.g. "1.234,56" → 1234.56
            let raw = snapshot[key]?.trimmingCharacters(in: .whitespaces) ?? ""
            guard !raw.isEmpty else { return nil }
            let normalized = raw.replacingOccurrences(of: ".", with: "").replacingOccurrences(of: ",", with: ".")
            return Double(normalized)
        }

        switch type {
        case .memberRegistration:
            try await formsRepository.submitMemberRegistration(form: MemberRegistrationForm(
                fullName: req("name"),
                birthDate: req("birth_date"),
                phone: req("phone"),
                gender: req("gender"),
                civilState: req("civil_state"),
                sectorId: Int32(req("sector_id")) ?? 0,
                email: opt("email"),
                lifeGroupId: opt("life_group_id").flatMap { Int32($0) }.map { KotlinInt(value: $0) },
                cep: opt("cep"),
                street: opt("street"),
                addressNumber: opt("address_number"),
                complement: opt("complement"),
                neighborhood: opt("neighborhood"),
                city: opt("city"),
                state: opt("state"),
                address: opt("address")
            ))
        case .conversion:
            try await formsRepository.submitConversion(form: ConversionForm(
                fullName: req("name"),
                email: req("email"),
                phone: req("phone"),
                decisionType: req("decision_type"),
                howMetChurch: req("how_met_church"),
                gender: req("gender"),
                birthDate: req("birth_date"),
                civilState: req("civil_state"),
                address: req("address"),
                attendanceCount: req("attendance_count"),
                lifeGroupStatus: req("life_group_status"),
                lifeGroupLeaderOrName: opt("life_group_leader_or_name"),
                invitedBy: opt("invited_by"),
                notes: opt("notes")
            ))
        case .guest:
            try await formsRepository.submitGuest(form: GuestForm(
                fullName: req("name"),
                email: opt("email"),
                phone: opt("phone"),
                invitedBy: opt("invited_by"),
                viaCasaDePaz: (fields["via_casa_de_paz"] == "true"),
                howMetChurch: opt("how_met_church"),
                address: opt("address"),
                date: req("date")
            ))
        case .multiplication:
            try await formsRepository.submitMultiplication(form: MultiplicationForm(
                date: req("date"),
                sourceLifeGroupId: Int32(req("source_life_group_id")) ?? 0,
                area: opt("area"),
                sector: opt("sector"),
                newLifeGroupName: req("new_life_group_name"),
                newLeaderId: Int32(req("new_leader_id")) ?? 0,
                hostId: Int32(req("host_id")) ?? 0,
                leaderPhone: req("leader_phone"),
                meetingDayTime: req("meeting_day_time"),
                address: req("address"),
                membersToMove: [],
                newMembers: [],
                completedLeadershipTrack: false,
                legallyMarried: nil,
                faithfulTither: false,
                evangelizingAndConsolidating: false,
                goodTestimony: false,
                singleLivingInPurity: nil
            ))
        case .serviceReport:
            try await formsRepository.submitServiceReport(form: ServiceReportForm(
                date: req("date"),
                reportType: req("report_type"),
                period: req("period"),
                atmosphereTeamId: opt("atmosphere_team_id").flatMap { Int32($0) }.map { KotlinInt(value: $0) },
                atmosphereTeamOther: nil,
                atmosphereResponsible: currentUserName,
                tadelAdults: intVal("tadel_adults"),
                tadelKids: intVal("tadel_kids"),
                vehiclesCars: intVal("vehicles_cars"),
                vehiclesMotos: intVal("vehicles_motos"),
                vehiclesBikes: intVal("vehicles_bikes"),
                vehiclesOthers: opt("vehicles_others"),
                volunteersAtmosfera: intVal("volunteers_atmosfera"),
                volunteersLouvor: intVal("volunteers_louvor"),
                volunteersMiddia: intVal("volunteers_midia"),
                volunteersDanca: intVal("volunteers_danca"),
                notes: opt("notes")
            ))
        case .course:
            try await formsRepository.submitCourse(form: CourseForm(
                courseName: req("course_name"), memberId: userId, enrolledAt: req("enrolled_at")
            ))
        case .lifeGroupReport:
            try await formsRepository.submitLifeGroupReport(form: LifeGroupReportForm(
                lifeGroupId: userId,
                date: req("date"),
                attendees: intVal("attendees"),
                visitors: intVal("visitors"),
                offerings: dblVal("offerings").map { KotlinDouble(value: $0) },
                observations: opt("observations")
            ))
        case .sectorSupervisorReport:
            try await formsRepository.submitSectorReport(form: SectorSupervisorReportForm(
                date: req("date"),
                sectorId: Int32(req("sector_id")) ?? 0,
                areaId: nil,
                lifeGroupsVisited: [],
                leadersPastored: [],
                multiplicationCandidates: [],
                lifeGroupsCount: 0,
                lifeGroupsSupervised: 0,
                lifeGroupObservations: [],
                sectorMultiplicationDate: nil,
                notes: opt("notes")
            ))
        default:
            try await formsRepository.submitAreaReport(form: AreaSupervisorReportForm(
                date: req("date"),
                areaId: Int32(req("area_id")) ?? 0,
                sectorsVisited: [],
                sectorLeadersPastored: [],
                multiplicationsInProgress: nil,
                lifeGroupsCount: 0,
                lifeGroupsSupervised: 0,
                lifeGroupObservations: [],
                notes: opt("notes")
            ))
        }
    }
}

// MARK: - View

struct FormDetailView: View {
    let form: FormCatalogItem
    @State private var viewModel: FormDetailViewModelIOS
    @Environment(\.dismiss) var dismiss

    init(form: FormCatalogItem) {
        self.form = form
        _viewModel = State(initialValue: FormDetailViewModelIOS(
            formId: form.id,
            formsRepository: IosAppContainer.shared.formsRepository,
            authRepository: IosAppContainer.shared.authRepository
        ))
    }

    var body: some View {
        VStack(spacing: 0) {
            if viewModel.isLoading {
                loadingState
            } else {
                formContent
            }
        }
        .background(PazColors.background)
        .navigationTitle(form.title)
        .navigationBarTitleDisplayMode(.large)
        .onChange(of: viewModel.submitSuccess) { success in
            if success { dismiss() }
        }
    }

    private var formContent: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: PazSpacing.lg) {
                    Spacer().frame(height: PazSpacing.sm)

                    if let description = form.description_ {
                        Text(description)
                            .font(PazTypography.bodySmall)
                            .foregroundColor(.gray)
                    }

                    ForEach(form.type.fieldDefs, id: \.key) { def in
                        FieldRow(
                            def: def,
                            value: viewModel.fields[def.key] ?? "",
                            extraFields: viewModel.fields,
                            isSubmitting: viewModel.isSubmitting,
                            selfOrSearchModes: viewModel.selfOrSearchModes,
                            onChange: { viewModel.update(key: def.key, value: $0) },
                            onOpenPicker: viewModel.openPicker,
                            onSelfOrSearchMode: viewModel.setSelfOrSearchMode
                        )
                    }

                    if let error = viewModel.error {
                        Text(error)
                            .font(PazTypography.bodySmall)
                            .foregroundColor(.red)
                            .padding(PazSpacing.md)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(12)
                    }

                    Spacer().frame(height: PazSpacing.md)
                }
                .padding(.horizontal, PazSpacing.lg)
            }
            .background(PazColors.background)
            .sheet(isPresented: Binding(
                get: { viewModel.pickerKey != nil && !viewModel.pickerIsLifeGroup },
                set: { if !$0 { viewModel.closePicker() } }
            )) {
                UserPickerSheet(viewModel: viewModel)
            }
            .sheet(isPresented: Binding(
                get: { viewModel.pickerKey != nil && viewModel.pickerIsLifeGroup },
                set: { if !$0 { viewModel.closePicker() } }
            )) {
                LifeGroupPickerSheet(viewModel: viewModel)
            }

            Button(action: { viewModel.onSubmit() }) {
                Text(viewModel.isSubmitting ? "Enviando..." : "Enviar")
                    .font(PazTypography.titleMedium)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                    .background(viewModel.canSubmit ? PazColors.primary : Color.gray)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(!viewModel.canSubmit)
            .padding(.horizontal, PazSpacing.lg)
            .padding(.vertical, PazSpacing.md)
            .background(PazColors.background)
        }
    }

    private var loadingState: some View {
        VStack(spacing: PazSpacing.lg) {
            Spacer().frame(height: PazSpacing.sm)
            ForEach(0..<3, id: \.self) { _ in
                VStack(alignment: .leading, spacing: PazSpacing.sm) {
                    SkeletonView().frame(width: 80, height: 14)
                    SkeletonView().frame(height: 48)
                }
            }
            Spacer()
        }
        .padding(PazSpacing.lg)
        .background(PazColors.background)
    }
}

private struct FieldRow: View {
    let def: FormFieldDef
    let value: String
    let extraFields: [String: String]
    let isSubmitting: Bool
    let selfOrSearchModes: [String: Bool]
    let onChange: (String) -> Void
    let onOpenPicker: (FormFieldDef) -> Void
    let onSelfOrSearchMode: (String, Bool) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: PazSpacing.sm) {
            HStack(spacing: 4) {
                Text(def.label)
                    .font(PazTypography.labelMedium)
                if def.required {
                    Text("*")
                        .font(PazTypography.labelMedium)
                        .foregroundColor(Color(red: 0.91, green: 0.30, blue: 0.24))
                }
            }

            switch def.fieldType {
            case .multiline:
                TextEditor(text: Binding(get: { value }, set: onChange))
                    .font(PazTypography.bodyMedium)
                    .frame(height: 120)
                    .padding(PazSpacing.sm)
                    .background(PazColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .scrollContentBackground(.hidden)
                    .disabled(isSubmitting)

            case .date:
                DateFieldRow(value: value, onChange: onChange, disabled: isSubmitting)

            case .phone:
                MaskedTextField(
                    placeholder: def.placeholder,
                    initialValue: value,
                    disabled: isSubmitting,
                    keyboardType: .numberPad,
                    contentType: .telephoneNumber,
                    mask: applyPhoneMask,
                    onChange: onChange
                )

            case .email:
                TextField(def.placeholder, text: Binding(get: { value }, set: onChange))
                    .font(PazTypography.bodyMedium)
                    .keyboardType(.emailAddress)
                    .textContentType(.emailAddress)
                    .autocapitalization(.none)
                    .padding(.horizontal, PazSpacing.md)
                    .frame(height: 56)
                    .background(PazColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .disabled(isSubmitting)

            case .name:
                TextField(def.placeholder, text: Binding(get: { value }, set: onChange))
                    .font(PazTypography.bodyMedium)
                    .textContentType(.name)
                    .autocapitalization(.words)
                    .padding(.horizontal, PazSpacing.md)
                    .frame(height: 56)
                    .background(PazColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .disabled(isSubmitting)

            case .integer:
                TextField(def.placeholder, text: Binding(
                    get: { value },
                    set: { new in onChange(new.filter(\.isNumber)) }
                ))
                .font(PazTypography.bodyMedium)
                .keyboardType(.numberPad)
                .padding(.horizontal, PazSpacing.md)
                .frame(height: 56)
                .background(PazColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .disabled(isSubmitting)

            case .currency:
                MaskedTextField(
                    placeholder: def.placeholder,
                    initialValue: value,
                    disabled: isSubmitting,
                    keyboardType: .numberPad,
                    mask: { _, new in applyCurrencyMask(new) },
                    onChange: onChange
                )

            case .toggle:
                Toggle(isOn: Binding(
                    get: { value == "true" },
                    set: { onChange($0 ? "true" : "false") }
                )) {
                    EmptyView()
                }
                .disabled(isSubmitting)

            case .text:
                TextField(def.placeholder, text: Binding(get: { value }, set: onChange))
                    .font(PazTypography.bodyMedium)
                    .autocapitalization(.sentences)
                    .padding(.horizontal, PazSpacing.md)
                    .frame(height: 56)
                    .background(PazColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .disabled(isSubmitting)

            case .select:
                let displayValue: String = {
                    if def.optionValues.isEmpty { return value }
                    guard let idx = def.optionValues.firstIndex(of: value) else { return value }
                    return def.options[idx]
                }()
                Menu {
                    ForEach(Array(def.options.enumerated()), id: \.offset) { idx, label in
                        Button(label) {
                            let apiValue = def.optionValues.isEmpty ? label : def.optionValues[idx]
                            onChange(apiValue)
                        }
                    }
                } label: {
                    HStack {
                        Text(displayValue.isEmpty ? (def.placeholder.isEmpty ? "Selecionar" : def.placeholder) : displayValue)
                            .font(PazTypography.bodyMedium)
                            .foregroundStyle(displayValue.isEmpty ? PazColors.slate : PazColors.ink)
                        Spacer()
                        Image(systemName: "chevron.down").foregroundStyle(PazColors.pazPrimary)
                    }
                    .padding(.horizontal, PazSpacing.md)
                    .frame(height: 56)
                    .background(PazColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(isSubmitting)

            case .userPicker, .userMultiPicker:
                let displayName = extraFields["\(def.key)_name"] ?? ""
                Button(action: { if !isSubmitting { onOpenPicker(def) } }) {
                    HStack {
                        Text(displayName.isEmpty ? "Selecionar pessoa" : displayName)
                            .font(PazTypography.bodyMedium)
                            .foregroundStyle(displayName.isEmpty ? PazColors.slate : PazColors.ink)
                        Spacer()
                        Image(systemName: "chevron.down").foregroundStyle(PazColors.pazPrimary)
                    }
                    .padding(.horizontal, PazSpacing.md)
                    .frame(height: 56)
                    .background(PazColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .buttonStyle(.plain)

            case .lgPicker:
                let displayName = extraFields["\(def.key)_name"] ?? ""
                Button(action: { if !isSubmitting { onOpenPicker(def) } }) {
                    HStack {
                        Text(displayName.isEmpty ? "Selecionar grupo de vida" : displayName)
                            .font(PazTypography.bodyMedium)
                            .foregroundStyle(displayName.isEmpty ? PazColors.slate : PazColors.ink)
                        Spacer()
                        Image(systemName: "chevron.down").foregroundStyle(PazColors.pazPrimary)
                    }
                    .padding(.horizontal, PazSpacing.md)
                    .frame(height: 56)
                    .background(PazColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .buttonStyle(.plain)

            case .selfOrSearch:
                let isSearchMode = selfOrSearchModes[def.key] == true
                VStack(alignment: .leading, spacing: PazSpacing.sm) {
                    HStack(spacing: PazSpacing.sm) {
                        Button("Eu mesmo") { onSelfOrSearchMode(def.key, false) }
                            .buttonStyle(.bordered)
                            .tint(isSearchMode ? .secondary : PazColors.pazPrimary)
                        Button("Buscar pessoa") { onSelfOrSearchMode(def.key, true) }
                            .buttonStyle(.bordered)
                            .tint(isSearchMode ? PazColors.pazPrimary : .secondary)
                    }
                    if isSearchMode {
                        let displayName = extraFields["\(def.key)_name"] ?? ""
                        Button(action: { if !isSubmitting { onOpenPicker(def) } }) {
                            HStack {
                                Text(displayName.isEmpty ? "Selecionar pessoa" : displayName)
                                    .font(PazTypography.bodyMedium)
                                    .foregroundStyle(displayName.isEmpty ? PazColors.slate : PazColors.ink)
                                Spacer()
                                Image(systemName: "chevron.down").foregroundStyle(PazColors.pazPrimary)
                            }
                            .padding(.horizontal, PazSpacing.md)
                            .frame(height: 56)
                            .background(PazColors.surface)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }
}

// Uses local @State so the mask runs inside onChange(of:) — the only reliable
// way to intercept and replace text in SwiftUI without cursor/state conflicts.
private struct MaskedTextField: View {
    let placeholder: String
    let initialValue: String
    let disabled: Bool
    var keyboardType: UIKeyboardType = .default
    var contentType: UITextContentType? = nil
    let mask: (String, String) -> String  // (old, new) -> masked
    let onChange: (String) -> Void

    @State private var text: String = ""

    var body: some View {
        TextField(placeholder, text: $text)
            .font(PazTypography.bodyMedium)
            .keyboardType(keyboardType)
            .textContentType(contentType)
            .padding(.horizontal, PazSpacing.md)
            .frame(height: 56)
            .background(PazColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .disabled(disabled)
            .onAppear { text = initialValue }
            .onChange(of: text) { old, new in
                let masked = mask(old, new)
                if masked != new { text = masked }
                onChange(masked)
            }
    }
}

private struct DateFieldRow: View {
    let value: String
    let onChange: (String) -> Void
    let disabled: Bool

    @State private var showPicker = false
    @State private var selected: Date = {
        DateFormatter.brazilianDate.date(from: DateFormatter.brazilianDate.string(from: Date())) ?? Date()
    }()

    private let display = DateFormatter.brazilianDate

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button(action: { if !disabled { showPicker.toggle() } }) {
                HStack {
                    Text(value.isEmpty ? "DD/MM/YYYY" : value)
                        .font(PazTypography.bodyMedium)
                        .foregroundStyle(value.isEmpty ? PazColors.slate : PazColors.ink)
                    Spacer()
                    Image(systemName: "calendar").foregroundStyle(PazColors.pazPrimary)
                }
                .padding(.horizontal, PazSpacing.md)
                .frame(height: 56)
                .background(PazColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .buttonStyle(.plain)
            .onAppear {
                if let d = display.date(from: value) { selected = d }
                if value.isEmpty { onChange(display.string(from: Date())) }
            }

            if showPicker {
                DatePicker("", selection: $selected, displayedComponents: .date)
                    .datePickerStyle(.graphical)
                    .tint(PazColors.pazPrimary)
                    .onChange(of: selected) { _, d in
                        onChange(display.string(from: d))
                        showPicker = false
                    }
                    .padding(PazSpacing.sm)
                    .background(PazColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }
}

// MARK: - Input helpers

private func applyPhoneMask(old: String, new: String) -> String {
    var digits = new.filter(\.isNumber)
    let oldDigits = old.filter(\.isNumber)
    // User deleted a separator character — drop the preceding digit too
    if new.count < old.count, digits.count == oldDigits.count, !digits.isEmpty {
        digits = String(digits.dropLast())
    }
    return formatPhone(String(digits.prefix(11)))
}

// Separators go BEFORE the digit at boundary positions — no trailing chars at partial input
private func formatPhone(_ digits: String) -> String {
    let d = Array(digits)
    guard !d.isEmpty else { return "" }
    var result = ""
    for (i, c) in d.enumerated() {
        switch i {
        case 0: result = "(\(c)"
        case 1: result += "\(c)"
        case 2: result += ") \(c)"  // ") " inserted before 3rd digit
        case 3: result += " \(c)"   // " " inserted before 4th digit
        case 7: result += "-\(c)"   // "-" inserted before 8th digit
        default: result += "\(c)"
        }
    }
    return result
}

private func applyCurrencyMask(_ input: String) -> String {
    let digits = input.filter(\.isNumber)
    guard !digits.isEmpty else { return "" }
    let value = Int64(digits) ?? 0
    let reais = value / 100
    let centavos = value % 100
    let reaisStr = reais == 0 ? "0" : formatThousands(reais)
    return "\(reaisStr),\(String(format: "%02d", centavos))"
}

private func formatThousands(_ n: Int64) -> String {
    var result = ""
    let s = String(n)
    for (i, c) in s.reversed().enumerated() {
        if i > 0, i % 3 == 0 { result = "." + result }
        result = String(c) + result
    }
    return result
}

private extension DateFormatter {
    static let brazilianDate: DateFormatter = {
        let f = DateFormatter(); f.dateFormat = "dd/MM/yyyy"; return f
    }()
}

#Preview {
    FormDetailView(form: FormCatalogItem(
        id: "member-registrations",
        title: "Registro de Membro",
        description: "Formulário para registrar um novo membro",
        canWrite: true,
        canRead: true
    ))
}
