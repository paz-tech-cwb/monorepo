import Observation
import Shared
import SwiftUI

struct FormulariosView: View {
    @State private var viewModel: FormulariosViewModel
    @Environment(\.dismiss) var dismiss

    init(formsRepository: FormsRepository) {
        _viewModel = State(initialValue: FormulariosViewModel(formsRepository: formsRepository))
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
                            Text("Formulários")
                                .font(PazTypography.headlineMedium)
                                .foregroundColor(.white)
                            Spacer()
                        }
                        .padding(.horizontal, PazSpacing.lg)
                        .padding(.vertical, PazSpacing.md)
                    }
                    .background(PazColors.heroGradient)

                    // Content
                    if viewModel.isLoading {
                        loadingState
                    } else if viewModel.forms.isEmpty {
                        emptyState
                    } else {
                        contentState
                    }
                }
                .background(PazColors.background)
            }
        }
        .navigationBarBackButtonHidden()
    }

    private var contentState: some View {
        ScrollView {
            VStack(spacing: PazSpacing.md) {
                Spacer().frame(height: PazSpacing.sm)

                ForEach(viewModel.forms, id: \.id) { form in
                    NavigationLink(destination: FormDetailView(form: form)) {
                        FormCard(form: form)
                            .buttonStyle(.plain)
                    }
                }

                Spacer().frame(height: PazSpacing.xl)
            }
            .padding(.horizontal, PazSpacing.lg)
        }
        .background(PazColors.background)
    }

    private var emptyState: some View {
        VStack(spacing: PazSpacing.md) {
            Spacer()
            Text("Nenhum formulário disponível")
                .font(PazTypography.titleMedium)
            Text("Volte mais tarde para conferir novos formulários")
                .font(PazTypography.bodySmall)
                .foregroundColor(.gray)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(PazSpacing.lg)
        .background(PazColors.background)
    }

    private var loadingState: some View {
        VStack(spacing: PazSpacing.lg) {
            Spacer().frame(height: PazSpacing.lg)
            ForEach(0..<3, id: \.self) { _ in
                SkeletonView()
                    .frame(height: 120)
            }
            Spacer()
        }
        .padding(PazSpacing.lg)
        .background(PazColors.background)
    }
}

private struct FormCard: View {
    let form: FormCatalogItem

    var body: some View {
        VStack(alignment: .leading, spacing: PazSpacing.sm) {
            HStack {
                Text(form.title)
                    .font(PazTypography.titleSmall)
                Spacer()
                Text(form.type.name.replacingOccurrences(of: "_", with: " ").capitalized)
                    .font(PazTypography.labelSmall)
                    .foregroundColor(PazColors.primary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(PazColors.primary.opacity(0.12))
                    .cornerRadius(12)
            }

            if let description = form.description_ {
                Text(description)
                    .font(PazTypography.bodySmall)
                    .foregroundColor(.gray)
                    .lineLimit(2)
            }

            Spacer().frame(height: PazSpacing.sm)

            Button(action: {}) {
                Text("Abrir")
                    .font(PazTypography.titleMedium)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, PazSpacing.sm)
                    .background(PazColors.primary)
                    .cornerRadius(12)
            }
        }
        .padding(PazSpacing.lg)
        .background(PazColors.surface)
        .cornerRadius(16)
    }
}

@MainActor
@Observable
class FormulariosViewModel {
    var forms: [FormCatalogItem] = []
    var isLoading = true
    var error: String?

    private let formsRepository: FormsRepository

    init(formsRepository: FormsRepository) {
        self.formsRepository = formsRepository
        loadForms()
    }

    private func loadForms() {
        Task {
            do {
                self.forms = try await (formsRepository.getCatalog() as? [FormCatalogItem]) ?? []
                self.isLoading = false
            } catch {
                self.isLoading = false
                self.error = error.localizedDescription
            }
        }
    }
}

#Preview {
    FormulariosView(formsRepository: IosAppContainer.shared.formsRepository)
}
