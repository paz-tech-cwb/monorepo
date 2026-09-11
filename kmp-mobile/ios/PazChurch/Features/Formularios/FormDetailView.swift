import Observation
import Shared
import SwiftUI

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

    // MARK: - Step mode state

    var stepIndex: Int = 0
    var stepError: String?

    var currentDef: FormFieldDef? {
        guard let form else { return nil }
        let defs = form.type.fieldDefs
        guard !defs.isEmpty else { return nil }
        return defs[min(stepIndex, defs.count - 1)]
    }

    var isLastStep: Bool {
        guard let form else { return true }
        return stepIndex >= form.type.fieldDefs.count - 1
    }

    var progress: Double {
        guard let form, !form.type.fieldDefs.isEmpty else { return 0 }
        return Double(stepIndex + 1) / Double(form.type.fieldDefs.count)
    }

    // MARK: - Picker state

    var pickerKey: String?
    var pickerLabel: String = ""
    var pickerIsMulti: Bool = false
    var pickerIsLifeGroup: Bool = false
    var pickerQuery: String = ""
    var pickerResults: [Any] = []
    var pickerIsLoading: Bool = false
    var pickerError: String?
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
                    let initial: String = if def.fieldType == .date {
                        today
                    } else {
                        ""
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
        stepError = nil
    }

    /// Validates the current step's field (if required) and advances, capping at the last question.
    func nextStep() {
        guard let form else { return }
        let defs = form.type.fieldDefs
        guard let def = defs[safe: stepIndex] else { return }

        if def.required, (fields[def.key] ?? "").trimmingCharacters(in: .whitespaces).isEmpty {
            stepError = "\(def.label) é obrigatório"
            return
        }

        stepIndex = min(stepIndex + 1, defs.count - 1)
        stepError = nil
    }

    /// Floors at the first question — does not pop the screen.
    func previousStep() {
        stepIndex = max(stepIndex - 1, 0)
        stepError = nil
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

    func closePicker() {
        pickerKey = nil
    }

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
            let v = snapshot[key]?.trimmingCharacters(in: .whitespaces)
            return v?.isEmpty == false ? v : nil
        }
        func intVal(_ key: String) -> Int32 {
            Int32(snapshot[key]?.trimmingCharacters(in: .whitespaces) ?? "") ?? 0
        }
        func kdbl(_ key: String) -> KotlinDouble? {
            let raw = snapshot[key]?.trimmingCharacters(in: .whitespaces) ?? ""
            let n = raw.replacingOccurrences(of: ".", with: "").replacingOccurrences(of: ",", with: ".")
            return Double(n).map { KotlinDouble(value: $0) }
        }
        func isoDate(_ key: String) -> String {
            let raw = snapshot[key]?.trimmingCharacters(in: .whitespaces) ?? ""
            let fmt = DateFormatter(); fmt.dateFormat = "dd/MM/yyyy"
            let iso = DateFormatter(); iso.dateFormat = "yyyy-MM-dd"
            return fmt.date(from: raw).map { iso.string(from: $0) } ?? raw
        }
        func ids(_ key: String) -> [KotlinInt] {
            (snapshot[key] ?? "").split(separator: ",")
                .compactMap { Int32($0.trimmingCharacters(in: .whitespaces)) }
                .map { KotlinInt(value: $0) }
        }

        switch type {
        case .serviceReport:
            _ = try await formsRepository.submitServiceReport(form: ServiceReportForm(
                date: isoDate("date"), reportType: req("report_type"), period: req("period"),
                atmosphereTeamId: opt("atmosphere_team_id").flatMap { Int32($0) }.map { KotlinInt(value: $0) },
                atmosphereTeamOther: nil,
                atmosphereResponsible: req("atmosphere_responsible"),
                tadelAdults: intVal("tadel_adults"), tadelKids: intVal("tadel_kids"),
                vehiclesCars: intVal("vehicles_cars"), vehiclesMotos: intVal("vehicles_motos"),
                vehiclesBikes: intVal("vehicles_bikes"), vehiclesOthers: opt("vehicles_others"),
                volunteersAtmosfera: intVal("volunteers_atmosfera"), volunteersLouvor: intVal("volunteers_louvor"),
                volunteersMiddia: intVal("volunteers_midia"), volunteersDanca: intVal("volunteers_danca"),
                notes: opt("notes")
            ))

        case .guest:
            let invitedByRaw = req("invited_by")
            let invitedBy = invitedByRaw.isEmpty ? currentUserName : invitedByRaw
            _ = try await formsRepository.submitGuest(form: GuestForm(
                fullName: req("full_name"), email: opt("email"), phone: opt("phone"),
                invitedBy: invitedBy.isEmpty ? nil : invitedBy,
                viaCasaDePaz: snapshot["via_casa_de_paz"] == "true",
                howMetChurch: opt("how_met_church"), address: opt("address"),
                date: isoDate("date")
            ))

        case .multiplication:
            _ = try await formsRepository.submitMultiplication(form: MultiplicationForm(
                date: isoDate("date"),
                sourceLifeGroupId: intVal("source_life_group_id"),
                area: opt("area"), sector: opt("sector"),
                newLifeGroupName: req("new_life_group_name"),
                newLeaderId: intVal("new_leader_id"),
                hostId: intVal("host_id"),
                leaderPhone: req("leader_phone"),
                meetingDayTime: req("meeting_day_time"),
                address: req("address"),
                membersToMove: ids("members_to_move"),
                newMembers: ids("new_members"),
                completedLeadershipTrack: snapshot["completed_leadership_track"] == "true",
                legallyMarried: snapshot["legally_married"].map { KotlinBoolean(value: $0 == "true") },
                faithfulTither: snapshot["faithful_tither"] == "true",
                evangelizingAndConsolidating: snapshot["evangelizing_and_consolidating"] == "true",
                goodTestimony: snapshot["good_testimony"] == "true",
                singleLivingInPurity: snapshot["single_living_in_purity"].map { KotlinBoolean(value: $0 == "true") }
            ))

        case .memberRegistration:
            _ = try await formsRepository.submitMemberRegistration(form: MemberRegistrationForm(
                fullName: req("full_name"),
                birthDate: isoDate("birth_date"),
                phone: req("phone"),
                gender: req("gender"),
                civilState: req("civil_state"),
                sectorId: intVal("sector_id"),
                email: opt("email"),
                lifeGroupId: intVal("life_group_id") > 0 ? KotlinInt(value: intVal("life_group_id")) : nil,
                cep: nil, street: nil, addressNumber: nil, complement: nil,
                neighborhood: nil, city: nil, state: nil,
                address: opt("address")
            ))

        case .conversion:
            _ = try await formsRepository.submitConversion(form: ConversionForm(
                fullName: req("full_name"),
                email: req("email"),
                phone: req("phone"),
                decisionType: req("decision_type"),
                howMetChurch: req("how_met_church"),
                gender: req("gender"),
                birthDate: isoDate("birth_date"),
                civilState: req("civil_state"),
                address: req("address"),
                attendanceCount: req("attendance_count"),
                lifeGroupStatus: req("life_group_status"),
                lifeGroupLeaderOrName: opt("life_group_leader_or_name"),
                invitedBy: opt("invited_by"),
                notes: opt("notes")
            ))

        case .lifeGroupReport:
            _ = try await formsRepository.submitLifeGroupReport(form: LifeGroupReportForm(
                lifeGroupId: userId, date: isoDate("date"),
                attendees: intVal("attendees"), visitors: intVal("visitors"),
                offerings: kdbl("offerings"), observations: opt("observations")
            ))

        case .course:
            _ = try await formsRepository.submitCourse(form: CourseForm(
                courseName: req("course_name"), memberId: userId,
                enrolledAt: isoDate("enrolled_at")
            ))

        case .sectorSupervisorReport:
            let observations = req("life_group_observations")
                .split(separator: "\n").map(String.init).filter { !$0.isEmpty }
            _ = try await formsRepository.submitSectorReport(form: SectorSupervisorReportForm(
                date: isoDate("date"),
                sectorId: intVal("sector_id"),
                areaId: nil,
                lifeGroupsVisited: ids("life_groups_visited"),
                leadersPastored: ids("leaders_pastored"),
                multiplicationCandidates: ids("multiplication_candidates"),
                lifeGroupsCount: intVal("life_groups_count"),
                lifeGroupsSupervised: intVal("life_groups_supervised"),
                lifeGroupObservations: observations,
                sectorMultiplicationDate: opt("sector_multiplication_date"),
                notes: opt("notes")
            ))

        default: // areaSupervisorReport
            let observations = req("life_group_observations")
                .split(separator: "\n").map(String.init).filter { !$0.isEmpty }
            _ = try await formsRepository.submitAreaReport(form: AreaSupervisorReportForm(
                date: isoDate("date"),
                areaId: intVal("area_id"),
                sectorsVisited: ids("sectors_visited"),
                sectorLeadersPastored: ids("sector_leaders_pastored"),
                multiplicationsInProgress: intVal("multiplications_in_progress") > 0
                    ? KotlinInt(value: intVal("multiplications_in_progress")) : nil,
                lifeGroupsCount: intVal("life_groups_count"),
                lifeGroupsSupervised: intVal("life_groups_supervised"),
                lifeGroupObservations: observations,
                notes: opt("notes")
            ))
        }
    }
}

extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}

// MARK: - View

/// Scrollable all-at-once form screen. Kept as a fallback reachable from `FormStepView`
/// via "Ver todas as perguntas" for users who prefer to see every question at once.
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
        .background(PazMeshBackground())
        .navigationTitle(form.title)
        .navigationBarTitleDisplayMode(.large)
        .toolbarBackground(.hidden, for: .navigationBar)
        .onChange(of: viewModel.submitSuccess) { _, success in
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
                            .foregroundColor(PazColors.error)
                            .padding(PazSpacing.md)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(PazColors.error.opacity(0.1))
                            .cornerRadius(12)
                    }

                    Spacer().frame(height: PazSpacing.md)
                }
                .padding(.horizontal, PazSpacing.lg)
            }
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
            }
            .buttonStyle(.pazPillPrimary)
            .disabled(!viewModel.canSubmit)
            .padding(.horizontal, PazSpacing.lg)
            .padding(.vertical, PazSpacing.md)
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
    }
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
