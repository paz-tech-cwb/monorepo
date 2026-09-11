import SwiftUI

/// Renders one form field (label + input) for a given `FormFieldDef`. Reused by both the
/// scrollable all-at-once `FormDetailView` and the one-question-per-screen `FormStepView`.
struct FieldRow: View {
    let def: FormFieldDef
    let value: String
    let extraFields: [String: String]
    let isSubmitting: Bool
    let selfOrSearchModes: [String: Bool]
    let onChange: (String) -> Void
    let onOpenPicker: (FormFieldDef) -> Void
    let onSelfOrSearchMode: (String, Bool) -> Void

    /// Only used by `FormStepView` — hooks the field's keyboard "next"/"return" action to
    /// advance to the next question, and applies the right submit label for the last step.
    var isFocused: FocusState<Bool>.Binding?
    var submitLabel: SubmitLabel = .next
    var onSubmitField: () -> Void = {}

    var body: some View {
        VStack(alignment: .leading, spacing: PazSpacing.sm) {
            HStack(spacing: 4) {
                Text(def.label)
                    .font(PazTypography.labelMedium)
                if def.required {
                    Text("*")
                        .font(PazTypography.labelMedium)
                        .foregroundColor(PazColors.error)
                }
            }

            switch def.fieldType {
            case .multiline:
                TextField(def.placeholder, text: Binding(get: { value }, set: onChange), axis: .vertical)
                    .font(PazTypography.bodyMedium)
                    .lineLimit(4...8)
                    .padding(PazSpacing.sm)
                    .background(PazColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .disabled(isSubmitting)
                    .applyFocus(isFocused)
                    .submitLabel(submitLabel)
                    .onSubmit(onSubmitField)

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
                    onChange: onChange,
                    isFocused: isFocused,
                    submitLabel: submitLabel,
                    onSubmitField: onSubmitField
                )

            case .email:
                TextField(def.placeholder, text: Binding(get: { value }, set: onChange))
                    .font(PazTypography.bodyMedium)
                    .keyboardType(.emailAddress)
                    .textContentType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .padding(.horizontal, PazSpacing.md)
                    .frame(height: 56)
                    .background(PazColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .disabled(isSubmitting)
                    .applyFocus(isFocused)
                    .submitLabel(submitLabel)
                    .onSubmit(onSubmitField)

            case .name:
                TextField(def.placeholder, text: Binding(get: { value }, set: onChange))
                    .font(PazTypography.bodyMedium)
                    .textContentType(.name)
                    .textInputAutocapitalization(.words)
                    .padding(.horizontal, PazSpacing.md)
                    .frame(height: 56)
                    .background(PazColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .disabled(isSubmitting)
                    .applyFocus(isFocused)
                    .submitLabel(submitLabel)
                    .onSubmit(onSubmitField)

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
                .applyFocus(isFocused)
                .submitLabel(submitLabel)
                .onSubmit(onSubmitField)

            case .currency:
                MaskedTextField(
                    placeholder: def.placeholder,
                    initialValue: value,
                    disabled: isSubmitting,
                    keyboardType: .numberPad,
                    mask: { _, new in applyCurrencyMask(new) },
                    onChange: onChange,
                    isFocused: isFocused,
                    submitLabel: submitLabel,
                    onSubmitField: onSubmitField
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
                    .textInputAutocapitalization(.sentences)
                    .padding(.horizontal, PazSpacing.md)
                    .frame(height: 56)
                    .background(PazColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .disabled(isSubmitting)
                    .applyFocus(isFocused)
                    .submitLabel(submitLabel)
                    .onSubmit(onSubmitField)

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
                        Text(displayValue
                            .isEmpty ? (def.placeholder.isEmpty ? "Selecionar" : def.placeholder) : displayValue)
                            .font(PazTypography.bodyMedium)
                            .foregroundStyle(displayValue.isEmpty ? PazColors.slate : PazColors.ink)
                        Spacer()
                        Image(systemName: "chevron.down").foregroundStyle(PazColors.accent)
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
                        Image(systemName: "chevron.down").foregroundStyle(PazColors.accent)
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
                        Text(displayName.isEmpty ? "Selecionar life group" : displayName)
                            .font(PazTypography.bodyMedium)
                            .foregroundStyle(displayName.isEmpty ? PazColors.slate : PazColors.ink)
                        Spacer()
                        Image(systemName: "chevron.down").foregroundStyle(PazColors.accent)
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
                            .tint(isSearchMode ? .secondary : PazColors.accent)
                        Button("Buscar pessoa") { onSelfOrSearchMode(def.key, true) }
                            .buttonStyle(.bordered)
                            .tint(isSearchMode ? PazColors.accent : .secondary)
                    }
                    if isSearchMode {
                        let displayName = extraFields["\(def.key)_name"] ?? ""
                        Button(action: { if !isSubmitting { onOpenPicker(def) } }) {
                            HStack {
                                Text(displayName.isEmpty ? "Selecionar pessoa" : displayName)
                                    .font(PazTypography.bodyMedium)
                                    .foregroundStyle(displayName.isEmpty ? PazColors.slate : PazColors.ink)
                                Spacer()
                                Image(systemName: "chevron.down").foregroundStyle(PazColors.accent)
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

private extension View {
    /// Applies an optional `FocusState` binding — used only in step mode, where a single
    /// stable text field is reused across questions to keep the keyboard from flickering.
    @ViewBuilder
    func applyFocus(_ isFocused: FocusState<Bool>.Binding?) -> some View {
        if let isFocused {
            self.focused(isFocused)
        } else {
            self
        }
    }
}

/// Uses local @State so the mask runs inside onChange(of:) — the only reliable
/// way to intercept and replace text in SwiftUI without cursor/state conflicts.
struct MaskedTextField: View {
    let placeholder: String
    let initialValue: String
    let disabled: Bool
    var keyboardType: UIKeyboardType = .default
    var contentType: UITextContentType?
    let mask: (String, String) -> String // (old, new) -> masked
    let onChange: (String) -> Void
    var isFocused: FocusState<Bool>.Binding?
    var submitLabel: SubmitLabel = .next
    var onSubmitField: () -> Void = {}

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
            .applyFocus(isFocused)
            .submitLabel(submitLabel)
            .onSubmit(onSubmitField)
            .task { text = initialValue }
            .onChange(of: text) { old, new in
                let masked = mask(old, new)
                if masked != new { text = masked }
                onChange(masked)
            }
            .onChange(of: initialValue) { _, new in
                // Reseed when the underlying question changes (step mode reuses this
                // instance across different fields) — without this, stale text/cursor
                // state would leak between different questions of the same type.
                if new != text { text = new }
            }
    }
}

struct DateFieldRow: View {
    let value: String
    let onChange: (String) -> Void
    let disabled: Bool

    @State private var showPicker = false
    @State private var selected: Date = DateFormatter.brazilianDate
        .date(from: DateFormatter.brazilianDate.string(from: Date())) ?? Date()

    private let display = DateFormatter.brazilianDate

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button(action: { if !disabled { showPicker.toggle() } }) {
                HStack {
                    Text(value.isEmpty ? "DD/MM/YYYY" : value)
                        .font(PazTypography.bodyMedium)
                        .foregroundStyle(value.isEmpty ? PazColors.slate : PazColors.ink)
                    Spacer()
                    Image(systemName: "calendar").foregroundStyle(PazColors.accent)
                }
                .padding(.horizontal, PazSpacing.md)
                .frame(height: 56)
                .background(PazColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .buttonStyle(.plain)
            .task {
                if let d = display.date(from: value) { selected = d }
                if value.isEmpty { onChange(display.string(from: Date())) }
            }

            if showPicker {
                DatePicker("", selection: $selected, displayedComponents: .date)
                    .datePickerStyle(.graphical)
                    .tint(PazColors.accent)
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

/// Separators go BEFORE the digit at boundary positions — no trailing chars at partial input
private func formatPhone(_ digits: String) -> String {
    let d = Array(digits)
    guard !d.isEmpty else { return "" }
    var result = ""
    for (i, c) in d.enumerated() {
        switch i {
        case 0: result = "(\(c)"
        case 1: result += "\(c)"
        case 2: result += ") \(c)" // ") " inserted before 3rd digit
        case 3: result += " \(c)" // " " inserted before 4th digit
        case 7: result += "-\(c)" // "-" inserted before 8th digit
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

extension DateFormatter {
    static let brazilianDate: DateFormatter = {
        let f = DateFormatter(); f.dateFormat = "dd/MM/yyyy"; return f
    }()
}
