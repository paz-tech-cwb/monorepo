import Shared
import SwiftUI

struct EditProfileView: View {
    @State private var viewModel: EditProfileViewModel
    @Environment(\.dismiss) var dismiss

    init() {
        _viewModel = State(initialValue: EditProfileViewModel(
            userRepository: IosAppContainer.shared.userRepository,
            authRepository: IosAppContainer.shared.authRepository
        ))
    }

    var body: some View {
        NavigationStack {
            ZStack {
                VStack(spacing: 0) {
                    // Hero header
                    VStack(alignment: .leading) {
                        HStack(spacing: PazSpacing.lg) {
                            Button(action: { dismiss() }) {
                                Image(systemName: "chevron.left")
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(.white)
                            }
                            Text("Editar Perfil")
                                .font(PazTypography.headlineMedium)
                                .foregroundColor(.white)
                            Spacer()
                        }
                        .padding(.horizontal, PazSpacing.lg)
                        .padding(.vertical, PazSpacing.md)
                    }
                    .background(PazColors.heroGradient)

                    // Content
                    ScrollView {
                        VStack(spacing: PazSpacing.lg) {
                            Spacer().frame(height: PazSpacing.xl)

                            VStack(alignment: .leading, spacing: PazSpacing.sm) {
                                Text("Nome")
                                    .font(PazTypography.labelMedium)
                                    .foregroundColor(PazColors.onSurface)

                                TextField("Seu nome completo", text: $viewModel.name)
                                    .font(PazTypography.bodyMedium)
                                    .padding(.horizontal, PazSpacing.md)
                                    .padding(.vertical, PazSpacing.sm)
                                    .background(PazColors.surface)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                                    )
                            }
                            .padding(.horizontal, PazSpacing.lg)

                            Spacer().frame(height: PazSpacing.lg)

                            if let error = viewModel.error {
                                VStack(alignment: .leading) {
                                    Text(error)
                                        .font(PazTypography.bodySmall)
                                        .foregroundColor(.red)
                                }
                                .padding(PazSpacing.lg)
                                .background(Color.red.opacity(0.1))
                                .cornerRadius(12)
                                .padding(.horizontal, PazSpacing.lg)
                            }

                            Button(action: { viewModel.onSave() }) {
                                Text(viewModel.isSaving ? "Salvando..." : "Salvar")
                                    .font(PazTypography.titleMedium)
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, PazSpacing.md)
                                    .background(viewModel.isSaving ? Color.gray : PazColors.primary)
                                    .cornerRadius(12)
                                    .disabled(viewModel.isSaving || viewModel.name.trimmingCharacters(in: .whitespaces)
                                        .isEmpty)
                            }
                            .padding(.horizontal, PazSpacing.lg)

                            Spacer().frame(height: PazSpacing.xl)
                        }
                    }
                    .background(PazColors.background)
                }
                .background(PazColors.background)

                if viewModel.saveSuccess {
                    Color.clear
                        .onAppear {
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                                dismiss()
                            }
                        }
                }
            }
        }
        .navigationBarBackButtonHidden()
    }
}

#Preview {
    EditProfileView()
}
