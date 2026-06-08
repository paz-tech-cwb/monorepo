import Shared
import SwiftUI

struct EditProfileView: View {
    @State private var viewModel: EditProfileViewModel
    @Environment(\.dismiss) var dismiss
    @State private var showDatePicker = false

    init() {
        _viewModel = State(initialValue: EditProfileViewModel(
            userRepository: IosAppContainer.shared.userRepository,
            authRepository: IosAppContainer.shared.authRepository
        ))
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: PazSpacing.lg) {
                    Spacer().frame(height: PazSpacing.lg)

                    ProfileField(label: "Nome completo") {
                        TextField("Seu nome completo", text: $viewModel.name)
                            .textContentType(.name)
                            .autocapitalization(.words)
                            .keyboardType(.default)
                            .profileFieldStyle()
                    }

                    ProfileField(label: "Telefone (WhatsApp)") {
                        TextField("(41) 9 9999-9999", text: $viewModel.phone)
                            .textContentType(.telephoneNumber)
                            .keyboardType(.phonePad)
                            .profileFieldStyle()
                            .onChange(of: viewModel.phone) { old, new in
                                viewModel.phone = applyPhoneMask(old: old, new: new)
                            }
                    }

                    ProfileField(label: "Data de nascimento") {
                        Button(action: { showDatePicker.toggle() }) {
                            HStack {
                                if let date = viewModel.birthDate {
                                    Text(date, format: .dateTime.day().month(.wide).year())
                                        .foregroundStyle(PazColors.ink)
                                } else {
                                    Text("Selecionar data")
                                        .foregroundStyle(PazColors.slate)
                                }
                                Spacer()
                                Image(systemName: "calendar")
                                    .foregroundStyle(PazColors.pazPrimary)
                            }
                            .font(PazTypography.bodyMedium)
                            .padding(.horizontal, PazSpacing.md)
                            .frame(height: 56)
                            .background(PazColors.surface)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                        .buttonStyle(.plain)

                        if showDatePicker {
                            DatePicker(
                                "",
                                selection: Binding(
                                    get: { viewModel.birthDate ?? Date() },
                                    set: { viewModel.birthDate = $0 }
                                ),
                                in: ...Date(),
                                displayedComponents: .date
                            )
                            .datePickerStyle(.graphical)
                            .tint(PazColors.pazPrimary)
                            .onChange(of: viewModel.birthDate) { _, _ in showDatePicker = false }
                            .background(PazColors.surface)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }

                    if let error = viewModel.error {
                        Text(error)
                            .font(PazTypography.bodySmall)
                            .foregroundStyle(.red)
                            .padding(PazSpacing.md)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.red.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    Spacer().frame(height: PazSpacing.md)
                }
                .padding(.horizontal, PazSpacing.lg)
            }
            .background(PazColors.background)

            Button(action: { viewModel.onSave() }) {
                Text(viewModel.isSaving ? "Salvando..." : "Salvar")
                    .font(PazTypography.titleMedium)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                    .background(viewModel.isSaving ? PazColors.slate : PazColors.pazPrimary)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(viewModel.isSaving || viewModel.name.trimmingCharacters(in: .whitespaces).isEmpty)
            .padding(.horizontal, PazSpacing.lg)
            .padding(.vertical, PazSpacing.md)
            .background(PazColors.background)
        }
        .background(PazColors.background)
        .navigationTitle("Editar Perfil")
        .navigationBarTitleDisplayMode(.large)
        .onChange(of: viewModel.saveSuccess) { _, success in
            if success { dismiss() }
        }
    }
}

// MARK: - Helpers

private func applyPhoneMask(old: String, new: String) -> String {
    var digits = new.filter(\.isNumber)
    // If raw length shrank but digit count stayed the same,
    // the user deleted a formatting char — drop the last digit.
    let oldDigits = old.filter(\.isNumber)
    if new.count < old.count, digits.count == oldDigits.count, !digits.isEmpty {
        digits = String(digits.dropLast())
    }
    return formatPhoneDigits(digits)
}

private func formatPhoneDigits(_ digits: String) -> String {
    var result = ""
    let d = Array(digits.prefix(11))
    for (i, c) in d.enumerated() {
        switch i {
        case 0: result += "(\(c)"
        case 1: result += "\(c)) "
        case 2: result += "\(c) "
        case 6: result += "\(c)-"
        default: result += "\(c)"
        }
    }
    return result
}

// MARK: - Sub-views

private struct ProfileField<Content: View>: View {
    let label: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: PazSpacing.sm) {
            Text(label)
                .font(PazTypography.labelMedium)
                .foregroundStyle(PazColors.onSurface)
            content
        }
    }
}

private extension View {
    func profileFieldStyle() -> some View {
        self
            .font(PazTypography.bodyMedium)
            .padding(.horizontal, PazSpacing.md)
            .frame(height: 56)
            .background(PazColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

#Preview {
    NavigationStack {
        EditProfileView()
    }
}
