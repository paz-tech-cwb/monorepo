import Observation
import Shared
import SwiftUI

struct LifeGroupsView: View {
    @State private var viewModel: LifeGroupsViewModel
    @State private var showMap = true

    init(churchRepository: ChurchRepository) {
        _viewModel = State(initialValue: LifeGroupsViewModel(churchRepository: churchRepository))
    }

    var body: some View {
        VStack(spacing: 0) {
            if !viewModel.isLoading, viewModel.error == nil, !viewModel.lifeGroups.isEmpty {
                Picker("", selection: $showMap) {
                    Text("Mapa").tag(true)
                    Text("Lista").tag(false)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, PazSpacing.lg)
                .padding(.vertical, PazSpacing.sm)
                .background(PazColors.surface)
            }

            Group {
                if viewModel.isLoading {
                    loadingState
                } else if let error = viewModel.error {
                    errorState(error: error)
                } else if viewModel.lifeGroups.isEmpty {
                    emptyState("Nenhum grupo de vida encontrado")
                } else if showMap {
                    LifeGroupsMapView(lifeGroups: viewModel.lifeGroups)
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
        }
        .background(PazColors.background)
        .navigationTitle("Grupos de Vida")
        .navigationBarTitleDisplayMode(.large)
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

struct LifeGroupCard: View {
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

                VStack(alignment: .trailing, spacing: 4) {
                    Text("\(lifeGroup.membersCount) membros")
                        .font(PazTypography.labelSmall)
                        .foregroundColor(PazColors.primary)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(PazColors.primary.opacity(0.12))
                        .cornerRadius(20)
                    if lifeGroup.kidsCount > 0 {
                        Text("\(lifeGroup.kidsCount) crianças")
                            .font(PazTypography.labelSmall)
                            .foregroundColor(.gray)
                    }
                }
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

            if let location = lifeGroup.location, !location.isEmpty {
                HStack(spacing: PazSpacing.sm) {
                    Image(systemName: "mappin")
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                    Text(location)
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
@Observable
class LifeGroupsViewModel {
    var lifeGroups: [LifeGroup] = []
    var isLoading = true
    var error: String?

    private let churchRepository: ChurchRepository

    init(churchRepository: ChurchRepository) {
        self.churchRepository = churchRepository
        load()
    }

    private func load() {
        Task {
            do {
                self.lifeGroups = try await churchRepository.getAllLifeGroups()
                self.error = nil
            } catch {
                self.error = "Erro ao carregar dados"
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
    NavigationStack {
        LifeGroupsView(churchRepository: IosAppContainer.shared.churchRepository)
    }
}
