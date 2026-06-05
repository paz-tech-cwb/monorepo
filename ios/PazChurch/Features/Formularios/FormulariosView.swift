import Observation
import Shared
import SwiftUI

struct FormulariosView: View {
    @State private var viewModel: FormulariosViewModel
    @Environment(\.dismiss) private var dismiss

    init(formsRepository: FormsRepository) {
        _viewModel = State(initialValue: FormulariosViewModel(formsRepository: formsRepository))
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                PazColors.background.ignoresSafeArea()
                VStack(spacing: 0) {
                    headerBar
                    ZStack {
                        PazColors.background.clipShape(RoundedRectangle(cornerRadius: 28))
                            .ignoresSafeArea(edges: .bottom)
                        screenContent
                    }
                }
            }
            .navigationBarHidden(true)
        }
        .task { await viewModel.load() }
    }

    // MARK: - States

    @ViewBuilder
    private var screenContent: some View {
        if viewModel.isLoading {
            loadingState
        } else if viewModel.forms.isEmpty {
            emptyState
        } else {
            contentState
        }
    }

    private var headerBar: some View {
        HStack(spacing: 14) {
            Button(action: { dismiss() }) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .background(.white.opacity(0.15))
                    .clipShape(Circle())
            }
            Text("Formulários").font(PazTypography.headlineMedium).foregroundStyle(.white)
            Spacer()
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
        .background(PazColors.heroGradient)
    }

    private var contentState: some View {
        ScrollView {
            VStack(spacing: 10) {
                Spacer().frame(height: 8)
                ForEach(viewModel.forms, id: \.id) { form in
                    NavigationLink(destination: FormDetailView(form: form)) {
                        FormCard(form: form)
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, 20)
                }
                Spacer().frame(height: 32)
            }
            .padding(.top, 8)
        }
        .background(PazColors.background)
    }

    private var emptyState: some View {
        VStack {
            Spacer()
            Text("Nenhum formulário disponível").font(PazTypography.titleMedium)
            Text("Volte mais tarde para conferir novos formulários")
                .font(PazTypography.bodySmall).foregroundStyle(PazColors.slate).multilineTextAlignment(.center)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(20)
    }

    private var loadingState: some View {
        VStack(spacing: 12) {
            Spacer().frame(height: 16)
            ForEach(0..<3, id: \.self) { _ in SkeletonView().frame(height: 72).padding(.horizontal, 20) }
            Spacer()
        }
        .background(PazColors.background)
    }
}

// MARK: - Sub-views

private struct FormCard: View {
    let form: FormCatalogItem

    private var tint: Color {
        let name = form.type.name.uppercased()
        if name.contains("CONVERSION") { return PazColors.pazPrimaryLight }
        if name.contains("GUEST") { return Color(hex: "2E7D32") }
        if name.contains("SERVICE") { return Color(hex: "6A1B9A") }
        if name.contains("REPORT") { return Color(hex: "E65100") }
        return PazColors.pazPrimary
    }

    private var icon: String {
        let name = form.type.name.uppercased()
        if name.contains("CONVERSION") { return "heart.fill" }
        if name.contains("GUEST") { return "person.badge.plus" }
        if name.contains("SERVICE") { return "building.columns.fill" }
        if name.contains("REPORT") { return "doc.text.fill" }
        return "list.clipboard.fill"
    }

    var body: some View {
        HStack(spacing: 12) {
            PazIconContainer(icon: icon, tint: tint, size: 42)
            VStack(alignment: .leading, spacing: 2) {
                Text(form.title).font(PazTypography.titleSmall).foregroundStyle(PazColors.ink)
                if let desc = form.description_, !desc.isEmpty {
                    Text(desc).font(PazTypography.bodySmall).foregroundStyle(PazColors.slate).lineLimit(1)
                }
            }
            Spacer()
            Image(systemName: "chevron.right").font(.system(size: 13)).foregroundStyle(PazColors.slateLight)
        }
        .padding(14)
        .background(PazColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

// MARK: - ViewModel

@MainActor
@Observable
class FormulariosViewModel {
    var forms: [FormCatalogItem] = []
    var isLoading = true
    var error: String?

    private let formsRepository: FormsRepository

    init(formsRepository: FormsRepository) {
        self.formsRepository = formsRepository
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            forms = try await (formsRepository.getCatalog() as? [FormCatalogItem]) ?? []
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

#Preview("Light") {
    FormulariosView(formsRepository: IosAppContainer.shared.formsRepository)
}

#Preview("Dark") {
    FormulariosView(formsRepository: IosAppContainer.shared.formsRepository)
        .preferredColorScheme(.dark)
}
