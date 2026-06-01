import SwiftUI
import Shared

struct MinistriesView: View {
    @StateObject private var viewModel: MinistriesViewModel
    @Environment(\.dismiss) var dismiss
    @State private var selectedTab = 0

    init(churchRepository: ChurchRepository) {
        _viewModel = StateObject(wrappedValue: MinistriesViewModel(churchRepository: churchRepository))
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
                    Text("Ministérios & Grupos")
                        .font(PazTypography.headlineMedium)
                        .foregroundColor(.white)
                    Spacer()
                }
                .padding(.horizontal, PazSpacing.lg)
                .padding(.vertical, PazSpacing.md)
                .background(PazColors.heroGradient)

                // Tab picker
                Picker("", selection: $selectedTab) {
                    Text("Ministérios").tag(0)
                    Text("Grupos de Vida").tag(1)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, PazSpacing.lg)
                .padding(.vertical, PazSpacing.sm)
                .background(PazColors.surface)

                // Content
                if viewModel.isLoading {
                    loadingState
                } else if let error = viewModel.error,
                          viewModel.ministries.isEmpty,
                          viewModel.lifeGroups.isEmpty {
                    errorState(error: error)
                } else if selectedTab == 0 {
                    ministriesTab
                } else {
                    lifeGroupsTab
                }
            }
            .background(PazColors.background)
        }
        .navigationBarBackButtonHidden()
    }

    @ViewBuilder
    private var ministriesTab: some View {
        if viewModel.ministries.isEmpty {
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
            .background(PazColors.background)
        }
    }

    @ViewBuilder
    private var lifeGroupsTab: some View {
        if viewModel.lifeGroups.isEmpty {
            emptyState("Nenhum grupo de vida encontrado")
        } else {
            ScrollView {
                VStack(spacing: PazSpacing.md) {
                    Spacer().frame(height: PazSpacing.sm)
                    ForEach(viewModel.lifeGroups, id: \.id) { lifeGroup in
                        NavigationLink(destination: LifeGroupDetailView(lifeGroup: lifeGroup)) {
                            LifeGroupCard(lifeGroup: lifeGroup)
                        }
                        .buttonStyle(.plain)
                    }
                    Spacer().frame(height: PazSpacing.xl)
                }
                .padding(.horizontal, PazSpacing.lg)
            }
            .background(PazColors.background)
        }
    }

    @ViewBuilder
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

    @ViewBuilder
    private func errorState(error: String) -> some View {
        VStack(spacing: PazSpacing.md) {
            Spacer()
            Text(error)
                .font(PazTypography.bodySmall)
                .foregroundColor(.gray)
            Button(action: { viewModel.onRetry() }) {
                Text("Tentar Novamente")
                    .font(PazTypography.titleMedium)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, PazSpacing.md)
                    .background(PazColors.primary)
                    .cornerRadius(12)
            }
            .padding(.horizontal, PazSpacing.lg)
            Spacer()
        }
    }

    @ViewBuilder
    private func emptyState(_ message: String) -> some View {
        VStack {
            Spacer()
            Text(message)
                .font(PazTypography.bodySmall)
                .foregroundColor(.gray)
            Spacer()
        }
    }
}

private struct MinistryCard: View {
    let ministry: Ministry

    var body: some View {
        HStack(spacing: PazSpacing.md) {
            ZStack {
                Circle()
                    .fill(PazColors.primary.opacity(0.1))
                    .frame(width: 48, height: 48)
                Image(systemName: "person.3.fill")
                    .font(.system(size: 18))
                    .foregroundColor(PazColors.primary)
            }

            VStack(alignment: .leading, spacing: PazSpacing.xs) {
                Text(ministry.name)
                    .font(PazTypography.titleSmall)
                if let description = ministry.description {
                    Text(description)
                        .font(PazTypography.bodySmall)
                        .foregroundColor(.gray)
                        .lineLimit(2)
                }
            }
            Spacer()
        }
        .padding(PazSpacing.lg)
        .background(PazColors.surface)
        .cornerRadius(16)
    }
}

private struct LifeGroupCard: View {
    let lifeGroup: LifeGroup

    var body: some View {
        VStack(alignment: .leading, spacing: PazSpacing.md) {
            HStack(spacing: PazSpacing.md) {
                ZStack {
                    Circle()
                        .fill(PazColors.primary.opacity(0.1))
                        .frame(width: 48, height: 48)
                    Image(systemName: "person.fill")
                        .font(.system(size: 18))
                        .foregroundColor(PazColors.primary)
                }

                VStack(alignment: .leading, spacing: PazSpacing.xs) {
                    Text(lifeGroup.name)
                        .font(PazTypography.titleSmall)
                    if let leader = lifeGroup.leader {
                        Text("Líder: \(leader)")
                            .font(PazTypography.bodySmall)
                            .foregroundColor(.gray)
                    }
                }

                Spacer()

                Text("\(lifeGroup.membersCount) membros")
                    .font(PazTypography.labelSmall)
                    .foregroundColor(PazColors.primary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(PazColors.primary.opacity(0.12))
                    .cornerRadius(20)
            }

            if lifeGroup.meetingDay != nil || lifeGroup.meetingTime != nil {
                HStack(spacing: PazSpacing.sm) {
                    Image(systemName: "calendar")
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                    Text([lifeGroup.meetingDay, lifeGroup.meetingTime].compactMap { $0 }.joined(separator: " • "))
                        .font(PazTypography.labelSmall)
                        .foregroundColor(.gray)
                }
            }

            if let address = lifeGroup.address {
                HStack(spacing: PazSpacing.sm) {
                    Image(systemName: "mappin")
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                    Text(address)
                        .font(PazTypography.bodySmall)
                        .foregroundColor(.gray)
                        .lineLimit(1)
                }
            }
        }
        .padding(PazSpacing.lg)
        .background(PazColors.surface)
        .cornerRadius(16)
    }
}

@MainActor
class MinistriesViewModel: ObservableObject {
    @Published var ministries: [Ministry] = []
    @Published var lifeGroups: [LifeGroup] = []
    @Published var isLoading = true
    @Published var error: String?

    private let churchRepository: ChurchRepository

    init(churchRepository: ChurchRepository) {
        self.churchRepository = churchRepository
        load()
    }

    private func load() {
        Task {
            async let churchResult = churchRepository.getChurch()
            async let lifeGroupsResult = churchRepository.getAllLifeGroups()

            do {
                let church = try await churchResult
                self.ministries = church.ministries
            } catch {
                // partial failure — lifeGroups may still load
            }

            do {
                self.lifeGroups = try await lifeGroupsResult
            } catch {
                // partial failure — ministries may still have loaded
            }

            if ministries.isEmpty && lifeGroups.isEmpty {
                error = "Erro ao carregar dados"
            }

            self.isLoading = false
        }
    }

    func onRetry() {
        isLoading = true
        error = nil
        load()
    }
}

#Preview {
    MinistriesView(churchRepository: ChurchRepositoryImpl())
}
