import SwiftUI
import Shared

// MARK: - Field Definitions

struct FormFieldDef {
    let key: String
    let label: String
    let placeholder: String
    let required: Bool
    let isNumeric: Bool
    let isMultiline: Bool

    init(_ key: String, _ label: String, placeholder: String = "", required: Bool = false, isNumeric: Bool = false, isMultiline: Bool = false) {
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
        switch self {
        case .member_registration:
            return [
                FormFieldDef("name",  "Nome Completo",       placeholder: "Digite o nome", required: true),
                FormFieldDef("phone", "Telefone",             placeholder: "(41) 9 9999-9999"),
                FormFieldDef("email", "E-mail",               placeholder: "email@exemplo.com"),
            ]
        case .conversion:
            return [
                FormFieldDef("name",         "Nome",                 required: true),
                FormFieldDef("phone",        "Telefone",             placeholder: "(41) 9 9999-9999"),
                FormFieldDef("date",         "Data da Conversão",    placeholder: "DD/MM/YYYY", required: true),
                FormFieldDef("observations", "Observações",          isMultiline: true),
            ]
        case .guest:
            return [
                FormFieldDef("name",       "Nome do Visitante", required: true),
                FormFieldDef("phone",      "Telefone",          placeholder: "(41) 9 9999-9999"),
                FormFieldDef("invited_by", "Convidado por"),
                FormFieldDef("date",       "Data da Visita",    placeholder: "DD/MM/YYYY", required: true),
            ]
        case .multiplication:
            return [
                FormFieldDef("new_life_group_name", "Nome do Novo Grupo",       required: true),
                FormFieldDef("date",                "Data da Multiplicação",    placeholder: "DD/MM/YYYY", required: true),
            ]
        case .service_report:
            return [
                FormFieldDef("date",         "Data do Culto",    placeholder: "DD/MM/YYYY", required: true),
                FormFieldDef("attendees",    "Participantes",    placeholder: "0",           required: true, isNumeric: true),
                FormFieldDef("visitors",     "Visitantes",       placeholder: "0",           isNumeric: true),
                FormFieldDef("offerings",    "Ofertas (R$)",     placeholder: "0,00",        isNumeric: true),
                FormFieldDef("observations", "Observações",                                  isMultiline: true),
            ]
        case .course:
            return [
                FormFieldDef("course_name", "Nome do Curso",       required: true),
                FormFieldDef("enrolled_at", "Data de Inscrição",   placeholder: "DD/MM/YYYY", required: true),
            ]
        case .life_group_report, .sector_supervisor_report, .area_supervisor_report:
            return [
                FormFieldDef("date",         "Data da Reunião",  placeholder: "DD/MM/YYYY", required: true),
                FormFieldDef("attendees",    "Participantes",    placeholder: "0",           required: true, isNumeric: true),
                FormFieldDef("visitors",     "Visitantes",       placeholder: "0",           isNumeric: true),
                FormFieldDef("offerings",    "Ofertas (R$)",     placeholder: "0,00",        isNumeric: true),
                FormFieldDef("observations", "Observações",                                  isMultiline: true),
            ]
        }
    }

    var displayName: String {
        switch self {
        case .member_registration:      return "Registro de Membro"
        case .conversion:               return "Conversão"
        case .guest:                    return "Visitante"
        case .multiplication:           return "Multiplicação"
        case .service_report:           return "Relatório de Culto"
        case .course:                   return "Curso"
        case .life_group_report:        return "Relatório de Grupo"
        case .sector_supervisor_report: return "Rel. Supervisor de Setor"
        case .area_supervisor_report:   return "Rel. Supervisor de Área"
        }
    }
}

// MARK: - ViewModel

@MainActor
class FormDetailViewModelIOS: ObservableObject {
    @Published var form: FormCatalogItem?
    @Published var fields: [String: String] = [:]
    @Published var isLoading = true
    @Published var isSubmitting = false
    @Published var error: String?
    @Published var submitSuccess = false

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
                let catalog = try await formsRepository.getCatalog()
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
        guard let form = form else { return false }
        return !isSubmitting && form.type.fieldDefs
            .filter { $0.required }
            .allSatisfy { !(fields[$0.key] ?? "").trimmingCharacters(in: .whitespaces).isEmpty }
    }

    func onSubmit() {
        guard let form = form else { return }

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
                let userId = try await authRepository.currentUser()?.id ?? ""
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
        let f = fields
        func req(_ k: String) -> String { f[k]?.trimmingCharacters(in: .whitespaces) ?? "" }
        func opt(_ k: String) -> String? { let v = f[k]?.trimmingCharacters(in: .whitespaces); return v?.isEmpty == false ? v : nil }
        func int32(_ k: String) -> Int32 { Int32(f[k]?.trimmingCharacters(in: .whitespaces) ?? "") ?? 0 }
        func dbl(_ k: String) -> Double? { Double(f[k]?.trimmingCharacters(in: .whitespaces) ?? "") }

        switch type {
        case .member_registration:
            _ = try await formsRepository.submitMemberRegistration(form: MemberRegistrationForm(
                name: req("name"), phone: opt("phone"), email: opt("email"),
                lifeGroupId: nil, sectorId: nil, areaId: nil, leaderId: nil
            ))
        case .conversion:
            _ = try await formsRepository.submitConversion(form: ConversionForm(
                name: req("name"), phone: opt("phone"), date: req("date"),
                lifeGroupId: nil, observations: opt("observations")
            ))
        case .guest:
            _ = try await formsRepository.submitGuest(form: GuestForm(
                name: req("name"), phone: opt("phone"), invitedBy: opt("invited_by"), date: req("date")
            ))
        case .multiplication:
            _ = try await formsRepository.submitMultiplication(form: MultiplicationForm(
                originalLifeGroupId: userId, newLifeGroupName: req("new_life_group_name"),
                newLeaderId: userId, date: req("date")
            ))
        case .service_report:
            _ = try await formsRepository.submitServiceReport(form: ServiceReportForm(
                date: req("date"), attendees: int32("attendees"), visitors: int32("visitors"),
                offerings: dbl("offerings"), observations: opt("observations")
            ))
        case .course:
            _ = try await formsRepository.submitCourse(form: CourseForm(
                courseName: req("course_name"), memberId: userId, enrolledAt: req("enrolled_at")
            ))
        case .life_group_report:
            _ = try await formsRepository.submitLifeGroupReport(report: MeetingReportRequest(
                lifeGroupId: userId, date: req("date"), attendees: int32("attendees"),
                visitors: int32("visitors"), offerings: dbl("offerings"), observations: opt("observations")
            ))
        case .sector_supervisor_report:
            _ = try await formsRepository.submitSectorReport(report: MeetingReportRequest(
                lifeGroupId: userId, date: req("date"), attendees: int32("attendees"),
                visitors: int32("visitors"), offerings: dbl("offerings"), observations: opt("observations")
            ))
        case .area_supervisor_report:
            _ = try await formsRepository.submitAreaReport(report: MeetingReportRequest(
                lifeGroupId: userId, date: req("date"), attendees: int32("attendees"),
                visitors: int32("visitors"), offerings: dbl("offerings"), observations: opt("observations")
            ))
        }
    }
}

// MARK: - View

struct FormDetailView: View {
    let form: FormCatalogItem
    @StateObject private var viewModel: FormDetailViewModelIOS
    @Environment(\.dismiss) var dismiss

    init(form: FormCatalogItem) {
        self.form = form
        _viewModel = StateObject(wrappedValue: FormDetailViewModelIOS(
            formId: form.id,
            formsRepository: FormsRepositoryImpl(),
            authRepository: AuthRepositoryImpl()
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

    @ViewBuilder
    private var formContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: PazSpacing.lg) {
                Spacer().frame(height: PazSpacing.sm)

                if let description = form.description {
                    Text(description)
                        .font(PazTypography.bodySmall)
                        .foregroundColor(.gray)
                }

                ForEach(form.type.fieldDefs, id: \.key) { def in
                    FieldRow(def: def, value: viewModel.fields[def.key] ?? "", isSubmitting: viewModel.isSubmitting) { newValue in
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

    @ViewBuilder
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
        type: .member_registration
    ))
}
