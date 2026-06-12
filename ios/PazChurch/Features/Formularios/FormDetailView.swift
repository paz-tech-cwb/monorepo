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
}

struct FormFieldDef {
    let key: String
    let label: String
    let placeholder: String
    let required: Bool
    let fieldType: FormFieldType

    init(
        _ key: String,
        _ label: String,
        placeholder: String = "",
        required: Bool = false,
        fieldType: FormFieldType = .text
    ) {
        self.key = key
        self.label = label
        self.placeholder = placeholder
        self.required = required
        self.fieldType = fieldType
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
                FormFieldDef("date", "Data da Visita", placeholder: "DD/MM/YYYY", required: true, fieldType: .date),
            ]
        case .multiplication:
            [
                FormFieldDef("new_life_group_name", "Nome do Novo Grupo", placeholder: "Ex: GL Norte", required: true),
                FormFieldDef("date", "Data da Multiplicação", placeholder: "DD/MM/YYYY", required: true, fieldType: .date),
            ]
        case .serviceReport:
            [
                FormFieldDef("date", "Data do Culto", placeholder: "DD/MM/YYYY", required: true, fieldType: .date),
                FormFieldDef("attendees", "Quantidade de Participantes", placeholder: "0", required: true, fieldType: .integer),
                FormFieldDef("visitors", "Quantidade de Visitantes", placeholder: "0", fieldType: .integer),
                FormFieldDef("offerings", "Oferta (R$)", placeholder: "0,00", fieldType: .currency),
                FormFieldDef("observations", "Observações", fieldType: .multiline),
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
            // Parse BRL formatted string e.g. "1.234,56" → 1234.56
            let raw = snapshot[key]?.trimmingCharacters(in: .whitespaces) ?? ""
            let normalized = raw.replacingOccurrences(of: ".", with: "").replacingOccurrences(of: ",", with: ".")
            return Double(normalized).map { KotlinDouble(value: $0) }
        }

        switch type {
        case .memberRegistration:
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
        case .serviceReport:
            _ = try await formsRepository.submitServiceReport(form: ServiceReportForm(
                date: req("date"), attendees: int32("attendees"), visitors: int32("visitors"),
                offerings: kdbl("offerings"), observations: opt("observations")
            ))
        case .course:
            _ = try await formsRepository.submitCourse(form: CourseForm(
                courseName: req("course_name"), memberId: userId, enrolledAt: req("enrolled_at")
            ))
        case .lifeGroupReport:
            _ = try await formsRepository.submitLifeGroupReport(form: LifeGroupReportForm(
                lifeGroupId: userId, date: req("date"), attendees: int32("attendees"),
                visitors: int32("visitors"), offerings: kdbl("offerings"), observations: opt("observations")
            ))
        case .sectorSupervisorReport:
            _ = try await formsRepository.submitSectorReport(form: LifeGroupReportForm(
                lifeGroupId: userId, date: req("date"), attendees: int32("attendees"),
                visitors: int32("visitors"), offerings: kdbl("offerings"), observations: opt("observations")
            ))
        default:
            _ = try await formsRepository.submitAreaReport(form: LifeGroupReportForm(
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
                }
                .padding(.horizontal, PazSpacing.lg)
            }
            .background(PazColors.background)

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

            case .text:
                TextField(def.placeholder, text: Binding(get: { value }, set: onChange))
                    .font(PazTypography.bodyMedium)
                    .autocapitalization(.sentences)
                    .padding(.horizontal, PazSpacing.md)
                    .frame(height: 56)
                    .background(PazColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .disabled(isSubmitting)
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
