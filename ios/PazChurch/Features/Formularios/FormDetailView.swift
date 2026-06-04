import Observation
import Shared
import SwiftUI

// MARK: - Field Definitions

struct FormFieldDef {
    let key: String
    let label: String
    let placeholder: String
    let required: Bool
    let isNumeric: Bool
    let isMultiline: Bool

    init(
        _ key: String,
        _ label: String,
        placeholder: String = "",
        required: Bool = false,
        isNumeric: Bool = false,
        isMultiline: Bool = false
    ) {
        self.key = key
        self.label = label
        self.placeholder = placeholder
        self.required = required
        self.isNumeric = isNumeric
        self.isMultiline = isMultiline
    }
}

extension FormType {
    var fieldDefs: [FormFieldDef] {
        if self == .memberRegistration {
            [
                FormFieldDef("name", "Nome Completo", placeholder: "Digite o nome", required: true),
                FormFieldDef("phone", "Telefone", placeholder: "(41) 9 9999-9999"),
                FormFieldDef("email", "E-mail", placeholder: "email@exemplo.com"),
            ]
        } else if self == .conversion {
            [
                FormFieldDef("name", "Nome", required: true),
                FormFieldDef("phone", "Telefone", placeholder: "(41) 9 9999-9999"),
                FormFieldDef("date", "Data da Conversão", placeholder: "DD/MM/YYYY", required: true),
                FormFieldDef("observations", "Observações", isMultiline: true),
            ]
        } else if self == .guest {
            [
                FormFieldDef("name", "Nome do Visitante", required: true),
                FormFieldDef("phone", "Telefone", placeholder: "(41) 9 9999-9999"),
                FormFieldDef("invited_by", "Convidado por"),
                FormFieldDef("date", "Data da Visita", placeholder: "DD/MM/YYYY", required: true),
            ]
        } else if self == .multiplication {
            [
                FormFieldDef("new_life_group_name", "Nome do Novo Grupo", required: true),
                FormFieldDef("date", "Data da Multiplicação", placeholder: "DD/MM/YYYY", required: true),
            ]
        } else if self == .serviceReport {
            [
                FormFieldDef("date", "Data do Culto", placeholder: "DD/MM/YYYY", required: true),
                FormFieldDef("attendees", "Participantes", placeholder: "0", required: true, isNumeric: true),
                FormFieldDef("visitors", "Visitantes", placeholder: "0", isNumeric: true),
                FormFieldDef("offerings", "Ofertas (R$)", placeholder: "0,00", isNumeric: true),
                FormFieldDef("observations", "Observações", isMultiline: true),
            ]
        } else if self == .course {
            [
                FormFieldDef("course_name", "Nome do Curso", required: true),
                FormFieldDef("enrolled_at", "Data de Inscrição", placeholder: "DD/MM/YYYY", required: true),
            ]
        } else {
            [
                FormFieldDef("date", "Data da Reunião", placeholder: "DD/MM/YYYY", required: true),
                FormFieldDef("attendees", "Participantes", placeholder: "0", required: true, isNumeric: true),
                FormFieldDef("visitors", "Visitantes", placeholder: "0", isNumeric: true),
                FormFieldDef("offerings", "Ofertas (R$)", placeholder: "0,00", isNumeric: true),
                FormFieldDef("observations", "Observações", isMultiline: true),
            ]
        }
    }

    var displayName: String {
        if self == .memberRegistration { return "Registro de Membro" }
        if self == .conversion { return "Conversão" }
        if self == .guest { return "Visitante" }
        if self == .multiplication { return "Multiplicação" }
        if self == .serviceReport { return "Relatório de Culto" }
        if self == .course { return "Curso" }
        if self == .lifeGroupReport { return "Relatório de Grupo" }
        if self == .sectorSupervisorReport { return "Rel. Supervisor de Setor" }
        return "Rel. Supervisor de Área"
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

    private let formsRepository: FormsRepository
    private let authRepository: AuthRepository
    private let formId: String

    init(formId: String, formsRepository: FormsRepository, authRepository: AuthRepository) {
        self.formId = formId
        self.formsRepository = formsRepository
        self.authRepository = authRepository
        loadForm()
    }

    private func loadForm() {
        Task {
            do {
                let catalogRaw = try await formsRepository.getCatalog()
                let catalog = (catalogRaw as? [FormCatalogItem]) ?? []
                guard let found = catalog.first(where: { $0.id == formId }) else {
                    self.error = "Formulário não encontrado"
                    self.isLoading = false
                    return
                }
                self.form = found
                self.fields = Dictionary(uniqueKeysWithValues: found.type.fieldDefs.map { ($0.key, "") })
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
        func int32(_ key: String) -> Int32 {
            Int32(snapshot[key]?.trimmingCharacters(in: .whitespaces) ?? "") ?? 0
        }
        func kdbl(_ key: String) -> KotlinDouble? {
            Double(snapshot[key]?.trimmingCharacters(in: .whitespaces) ?? "")
                .map { KotlinDouble(value: $0) }
        }

        if type == .memberRegistration {
            _ = try await formsRepository.submitMemberRegistration(form: MemberRegistrationForm(
                name: req("name"), phone: opt("phone"), email: opt("email"),
                lifeGroupId: nil, sectorId: nil, areaId: nil, leaderId: nil
            ))
        } else if type == .conversion {
            _ = try await formsRepository.submitConversion(form: ConversionForm(
                name: req("name"), phone: opt("phone"), date: req("date"),
                lifeGroupId: nil, observations: opt("observations")
            ))
        } else if type == .guest {
            _ = try await formsRepository.submitGuest(form: GuestForm(
                name: req("name"), phone: opt("phone"), invitedBy: opt("invited_by"), date: req("date")
            ))
        } else if type == .multiplication {
            _ = try await formsRepository.submitMultiplication(form: MultiplicationForm(
                originalLifeGroupId: userId, newLifeGroupName: req("new_life_group_name"),
                newLeaderId: userId, date: req("date")
            ))
        } else if type == .serviceReport {
            _ = try await formsRepository.submitServiceReport(form: ServiceReportForm(
                date: req("date"), attendees: int32("attendees"), visitors: int32("visitors"),
                offerings: kdbl("offerings"), observations: opt("observations")
            ))
        } else if type == .course {
            _ = try await formsRepository.submitCourse(form: CourseForm(
                courseName: req("course_name"), memberId: userId, enrolledAt: req("enrolled_at")
            ))
        } else if type == .lifeGroupReport {
            _ = try await formsRepository.submitLifeGroupReport(report: MeetingReportRequest(
                lifeGroupId: userId, date: req("date"), attendees: int32("attendees"),
                visitors: int32("visitors"), offerings: kdbl("offerings"), observations: opt("observations")
            ))
        } else if type == .sectorSupervisorReport {
            _ = try await formsRepository.submitSectorReport(report: MeetingReportRequest(
                lifeGroupId: userId, date: req("date"), attendees: int32("attendees"),
                visitors: int32("visitors"), offerings: kdbl("offerings"), observations: opt("observations")
            ))
        } else {
            _ = try await formsRepository.submitAreaReport(report: MeetingReportRequest(
                lifeGroupId: userId, date: req("date"), attendees: int32("attendees"),
                visitors: int32("visitors"), offerings: kdbl("offerings"), observations: opt("observations")
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
        NavigationStack {
            VStack(spacing: 0) {
                // Hero header
                HStack(spacing: PazSpacing.lg) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                    }
                    Text(form.title)
                        .font(PazTypography.headlineMedium)
                        .foregroundColor(.white)
                        .lineLimit(1)
                    Spacer()
                }
                .padding(.horizontal, PazSpacing.lg)
                .padding(.vertical, PazSpacing.md)
                .background(PazColors.heroGradient)

                if viewModel.isLoading {
                    loadingState
                } else {
                    formContent
                }
            }
            .background(PazColors.background)
        }
        .navigationBarBackButtonHidden()
        .onChange(of: viewModel.submitSuccess) { success in
            if success { dismiss() }
        }
    }

    private var formContent: some View {
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
                        isSubmitting: viewModel.isSubmitting
                    ) { newValue in
                        viewModel.update(key: def.key, value: newValue)
                    }
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

                Button(action: { viewModel.onSubmit() }) {
                    Text(viewModel.isSubmitting ? "Enviando..." : "Enviar")
                        .font(PazTypography.titleMedium)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, PazSpacing.md)
                        .background(viewModel.canSubmit ? PazColors.primary : Color.gray)
                        .cornerRadius(12)
                }
                .disabled(!viewModel.canSubmit)

                Spacer().frame(height: PazSpacing.xl)
            }
            .padding(.horizontal, PazSpacing.lg)
        }
        .background(PazColors.background)
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
    let isSubmitting: Bool
    let onChange: (String) -> Void

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

            if def.isMultiline {
                TextEditor(text: Binding(get: { value }, set: onChange))
                    .font(PazTypography.bodyMedium)
                    .frame(height: 100)
                    .padding(PazSpacing.sm)
                    .background(PazColors.surface)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                    )
                    .disabled(isSubmitting)
            } else {
                TextField(def.placeholder, text: Binding(get: { value }, set: onChange))
                    .font(PazTypography.bodyMedium)
                    .keyboardType(def.isNumeric ? .decimalPad : .default)
                    .padding(.horizontal, PazSpacing.md)
                    .padding(.vertical, PazSpacing.sm)
                    .background(PazColors.surface)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                    )
                    .disabled(isSubmitting)
            }
        }
    }
}

#Preview {
    FormDetailView(form: FormCatalogItem(
        id: "1",
        title: "Registro de Membro",
        description: "Formulário para registrar um novo membro",
        type: .memberRegistration
    ))
}
