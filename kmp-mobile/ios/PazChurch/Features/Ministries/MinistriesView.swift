import Observation
import Shared
import SwiftUI

struct MinistriesView: View {
    @State private var viewModel: MinistriesViewModel

    init(churchRepository: ChurchRepository) {
        _viewModel = State(initialValue: MinistriesViewModel(churchRepository: churchRepository))
    }

    var body: some View {
        Group {
            if viewModel.isLoading {
                loadingState
            } else if let error = viewModel.error {
                errorState(error: error)
            } else if viewModel.ministries.isEmpty {
                emptyState("Nenhum ministério encontrado")
            } else {
                ScrollView {
                    VStack(spacing: PazSpacing.md) {
                        Spacer().frame(height: PazSpacing.sm)
                        ForEach(viewModel.ministries, id: \.id) { ministry in
                            NavigationLink(destination: MinistryDetailView(ministry: ministry)) {
                                MinistryCard(ministry: ministry)
                            }
                            .buttonStyle(.plain)
                        }
                        Spacer().frame(height: PazSpacing.xl)
                    }
                    .padding(.horizontal, PazSpacing.lg)
                }
                .refreshable { await viewModel.load() }
            }
        }
        .background(PazMeshBackground())
        .navigationTitle("Ministérios")
        .navigationBarTitleDisplayMode(.large)
        .toolbarBackground(.hidden, for: .navigationBar)
    }

    private var loadingState: some View {
        ScrollView {
            VStack(spacing: PazSpacing.md) {
                Spacer().frame(height: PazSpacing.sm)
                ForEach(0..<4, id: \.self) { _ in
                    SkeletonView().frame(height: 80)
                }
                Spacer()
            }
            .padding(.horizontal, PazSpacing.lg)
        }
    }

    private func errorState(error: String) -> some View {
        VStack(spacing: PazSpacing.md) {
            Spacer()
            Text(error)
                .font(PazTypography.bodySmall)
                .foregroundColor(.gray)
            Button(action: { viewModel.onRetry() }) {
                Text("Tentar Novamente")
            }
            .buttonStyle(.pazPillPrimary)
            .padding(.horizontal, PazSpacing.lg)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func emptyState(_ message: String) -> some View {
        VStack {
            Spacer()
            Text(message)
                .font(PazTypography.bodySmall)
                .foregroundColor(.gray)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct MinistryCard: View {
    let ministry: Ministry

    var body: some View {
        GlassCard(radius: PazSpacing.cardRadiusCompact) {
            HStack(spacing: PazSpacing.md) {
                ZStack {
                    Circle()
                        .fill(PazColors.accent.opacity(0.1))
                        .frame(width: 48, height: 48)
                    Image(systemName: "person.3.fill")
                        .font(.system(size: 18))
                        .foregroundColor(PazColors.accent)
                }

                VStack(alignment: .leading, spacing: PazSpacing.xs) {
                    Text(ministry.name)
                        .font(PazTypography.titleSmall)
                    if let description = ministry.description_ {
                        Text(description)
                            .font(PazTypography.bodySmall)
                            .foregroundColor(.gray)
                            .lineLimit(2)
                    }
                }
                Spacer()
            }
            .padding(PazSpacing.lg)
        }
    }
}

@MainActor
@Observable
class MinistriesViewModel {
    var ministries: [Ministry] = []
    var isLoading = true
    var error: String?

    private let churchRepository: ChurchRepository

    init(churchRepository: ChurchRepository) {
        self.churchRepository = churchRepository
        Task { await load() }
    }

    func load() async {
        do {
            self.ministries = try await churchRepository.getAllMinistries()
            self.error = nil
        } catch {
            self.error = "Erro ao carregar dados"
        }
        self.isLoading = false
    }

    func onRetry() {
        isLoading = true
        error = nil
        Task { await load() }
    }
}

#Preview {
    NavigationStack {
        MinistriesView(churchRepository: IosAppContainer.shared.churchRepository)
    }
}
