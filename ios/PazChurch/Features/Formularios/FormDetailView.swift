import SwiftUI
import Shared

struct FormDetailView: View {
    let form: FormCatalogItem
    @Environment(\.dismiss) var dismiss

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
                            Text("Formulário")
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
                        VStack(alignment: .leading, spacing: PazSpacing.lg) {
                            Spacer().frame(height: PazSpacing.lg)

                            Text(form.title)
                                .font(PazTypography.headlineSmall)

                            if let description = form.description {
                                Text(description)
                                    .font(PazTypography.bodySmall)
                                    .foregroundColor(.gray)
                            }

                            Spacer().frame(height: PazSpacing.lg)

                            VStack(alignment: .center) {
                                Text("Implementação do formulário em desenvolvimento")
                                    .font(PazTypography.bodySmall)
                                    .foregroundColor(.gray)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(PazSpacing.lg)
                            .background(PazColors.surface)
                            .cornerRadius(12)

                            Spacer().frame(height: PazSpacing.xl)
                        }
                        .padding(.horizontal, PazSpacing.lg)
                    }
                    .background(PazColors.background)
                }
                .background(PazColors.background)
            }
        }
        .navigationBarBackButtonHidden()
    }
}

#Preview {
    FormDetailView(form: FormCatalogItem(
        id: "1",
        title: "Registro de Membro",
        description: "Formulário para novo registro",
        type: .member_registration
    ))
}
