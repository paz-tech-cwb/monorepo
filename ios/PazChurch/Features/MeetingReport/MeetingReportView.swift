import Observation
import Shared
import SwiftUI

private enum MeetingField: Hashable, CaseIterable {
    case attendees, visitors, offerings, observations
}

struct MeetingReportView: View {
    @State private var viewModel: MeetingReportViewModel
    @FocusState private var focused: MeetingField?

    init(formsRepository: FormsRepository, authRepository: AuthRepository) {
        _viewModel = State(initialValue: MeetingReportViewModel(
            formsRepository: formsRepository,
            authRepository: authRepository
        ))
    }

    @State private var selectedDate = Date()
    @State private var showDatePicker = false

    private var focusedIndex: Int {
        MeetingField.allCases.firstIndex(of: focused ?? .attendees) ?? 0
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: PazSpacing.lg) {
                    Spacer().frame(height: PazSpacing.lg)

                    DateFormField(
                        label: "Data da Reunião",
                        date: $selectedDate,
                        showPicker: $showDatePicker,
                        text: $viewModel.date
                    )
                    FormField(
                        label: "Participantes",
                        placeholder: "0",
                        text: $viewModel.attendees,
                        kind: .integer,
                        focus: $focused,
                        tag: .attendees
                    )
                    FormField(
                        label: "Visitantes",
                        placeholder: "0",
                        text: $viewModel.visitors,
                        kind: .integer,
                        focus: $focused,
                        tag: .visitors
                    )
                    FormField(
                        label: "Ofertas (R$)",
                        placeholder: "0,00",
                        text: $viewModel.offerings,
                        kind: .currency,
                        focus: $focused,
                        tag: .offerings
                    )
                    FormField(
                        label: "Observações",
                        placeholder: "Algo importante?",
                        text: $viewModel.observations,
                        kind: .multiline,
                        focus: $focused,
                        tag: .observations
                    )

                    if let error = viewModel.error {
                        Text(error)
                            .font(PazTypography.bodySmall)
                            .foregroundColor(.red)
                            .padding(PazSpacing.lg)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(12)
                    }

                    Spacer().frame(height: PazSpacing.md)
                }
                .padding(.horizontal, PazSpacing.lg)
            }
            .background(PazColors.background)

            Button(action: { viewModel.onSubmit() }) {
                Text(viewModel.isSubmitting ? "Enviando..." : "Enviar Relatório")
                    .font(PazTypography.titleMedium)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                    .background(viewModel.isSubmitting ? Color.gray : PazColors.primary)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(viewModel.isSubmitting || viewModel.date.isEmpty || viewModel.attendees.isEmpty)
            .padding(.horizontal, PazSpacing.lg)
            .padding(.vertical, PazSpacing.md)
            .background(PazColors.background)
        }
        .background(PazColors.background)
        .navigationTitle("Relatar Reunião")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Button(action: { moveFocus(by: -1) }) {
                    Image(systemName: "chevron.up")
                }
                .disabled(focused == MeetingField.allCases.first)
                Button(action: { moveFocus(by: 1) }) {
                    Image(systemName: "chevron.down")
                }
                .disabled(focused == MeetingField.allCases.last)
                Spacer()
                Button("OK") { focused = nil }
            }
        }
    }

    private func moveFocus(by offset: Int) {
        let all = MeetingField.allCases
        guard let current = focused, let idx = all.firstIndex(of: current) else { return }
        let next = idx + offset
        if all.indices.contains(next) { focused = all[next] }
    }
}

private struct DateFormField: View {
    let label: String
    @Binding var date: Date
    @Binding var showPicker: Bool
    @Binding var text: String

    private let formatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "dd/MM/yyyy"
        return f
    }()

    var body: some View {
        VStack(alignment: .leading, spacing: PazSpacing.sm) {
            Text(label)
                .font(PazTypography.labelMedium)
                .foregroundColor(PazColors.onSurface)

            Button(action: { showPicker.toggle() }) {
                HStack {
                    Text(text.isEmpty ? "DD/MM/YYYY" : text)
                        .font(PazTypography.bodyMedium)
                        .foregroundColor(text.isEmpty ? PazColors.slate : PazColors.ink)
                    Spacer()
                    Image(systemName: "calendar")
                        .foregroundColor(PazColors.pazPrimary)
                }
                .padding(.horizontal, PazSpacing.md)
                .frame(height: 56)
                .background(PazColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .buttonStyle(.plain)

            if showPicker {
                DatePicker("", selection: $date, displayedComponents: .date)
                    .datePickerStyle(.graphical)
                    .tint(PazColors.pazPrimary)
                    .onChange(of: date) { _, newDate in
                        text = formatter.string(from: newDate)
                        showPicker = false
                    }
                    .background(PazColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }
}

enum FormFieldKind {
    case text, integer, currency, multiline
}

private struct FormField: View {
    let label: String
    let placeholder: String
    @Binding var text: String
    var kind: FormFieldKind = .text
    var focus: FocusState<MeetingField?>.Binding?
    var tag: MeetingField?

    var body: some View {
        VStack(alignment: .leading, spacing: PazSpacing.sm) {
            Text(label)
                .font(PazTypography.labelMedium)
                .foregroundColor(PazColors.onSurface)

            switch kind {
            case .multiline:
                TextEditor(text: $text)
                    .font(PazTypography.bodyMedium)
                    .frame(height: 120)
                    .padding(PazSpacing.sm)
                    .background(PazColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .scrollContentBackground(.hidden)
                    .optionalFocused(focus, tag: tag)

            case .integer:
                TextField(placeholder, text: $text)
                    .font(PazTypography.bodyMedium)
                    .keyboardType(.numberPad)
                    .padding(.horizontal, PazSpacing.md)
                    .frame(height: 56)
                    .background(PazColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .optionalFocused(focus, tag: tag)
                    .onChange(of: text) { _, new in
                        text = new.filter(\.isNumber)
                    }

            case .currency:
                TextField(placeholder, text: $text)
                    .font(PazTypography.bodyMedium)
                    .keyboardType(.numberPad)
                    .padding(.horizontal, PazSpacing.md)
                    .frame(height: 56)
                    .background(PazColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .optionalFocused(focus, tag: tag)
                    .onChange(of: text) { _, new in
                        text = applyCurrencyMask(new)
                    }

            case .text:
                TextField(placeholder, text: $text)
                    .font(PazTypography.bodyMedium)
                    .padding(.horizontal, PazSpacing.md)
                    .frame(height: 56)
                    .background(PazColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .optionalFocused(focus, tag: tag)
            }
        }
    }
}

private extension View {
    @ViewBuilder
    func optionalFocused(_ binding: FocusState<MeetingField?>.Binding?, tag: MeetingField?) -> some View {
        if let binding, let tag {
            self.focused(binding, equals: tag)
        } else {
            self
        }
    }
}

private func parseCurrency(_ masked: String) -> Double? {
    // "1.500,75" → 1500.75
    let normalized = masked.replacingOccurrences(of: ".", with: "").replacingOccurrences(of: ",", with: ".")
    return Double(normalized)
}

private func applyCurrencyMask(_ input: String) -> String {
    let digits = input.filter(\.isNumber)
    guard !digits.isEmpty else { return "" }
    let value = (Double(digits) ?? 0) / 100
    let formatted = String(format: "%.2f", value)
    // Add thousands separator
    let parts = formatted.split(separator: ".")
    let intPart = String(parts[0])
    let decPart = parts.count > 1 ? String(parts[1]) : "00"
    var result = ""
    for (i, c) in intPart.reversed().enumerated() {
        if i > 0, i % 3 == 0 { result.insert(".", at: result.startIndex) }
        result.insert(c, at: result.startIndex)
    }
    return "\(result),\(decPart)"
}

@MainActor
@Observable
class MeetingReportViewModel {
    var date = ""
    var attendees = ""
    var visitors = ""
    var offerings = ""
    var observations = ""
    var isSubmitting = false
    var error: String?

    private let formsRepository: FormsRepository
    private let authRepository: AuthRepository

    init(formsRepository: FormsRepository, authRepository: AuthRepository) {
        self.formsRepository = formsRepository
        self.authRepository = authRepository
    }

    func onSubmit() {
        if date.isEmpty {
            error = "Data é obrigatória"
            return
        }
        if attendees.isEmpty {
            error = "Número de participantes é obrigatório"
            return
        }

        isSubmitting = true
        error = nil

        Task {
            do {
                let user = try await authRepository.currentUser() as? Shared.User
                let report = MeetingReportRequest(
                    lifeGroupId: user?.id ?? "",
                    date: date,
                    attendees: Int32(attendees) ?? 0,
                    visitors: Int32(visitors) ?? 0,
                    offerings: parseCurrency(offerings).map { KotlinDouble(value: $0) },
                    observations: observations.isEmpty ? nil : observations
                )

                try await formsRepository.submitLifeGroupReport(report: report)
                isSubmitting = false
                // Navigate back
            } catch {
                self.error = error.localizedDescription
                isSubmitting = false
            }
        }
    }
}

#Preview {
    MeetingReportView(
        formsRepository: IosAppContainer.shared.formsRepository,
        authRepository: IosAppContainer.shared.authRepository
    )
}
