import Observation
import Shared
import SwiftUI

// Defaults to just the viewer's own life group(s) — leaders/members of at
// least one group don't need to browse the whole church's list to find
// their own. "Ver mais grupos de vida" opens the unfiltered list/map for
// anyone who wants to browse others. A viewer with no group of their own
// sees the unfiltered list/map immediately, same as before this change.
struct LifeGroupsView: View {
    @State private var viewModel: LifeGroupsViewModel
    let churchRepository: ChurchRepository

    init(churchRepository: ChurchRepository) {
        self.churchRepository = churchRepository
        _viewModel = State(initialValue: LifeGroupsViewModel(churchRepository: churchRepository))
    }

    var body: some View {
        Group {
            if viewModel.isLoading {
                loadingState
            } else if let error = viewModel.error {
                errorState(error: error)
            } else if !viewModel.myLifeGroups.isEmpty {
                myGroupsContent
            } else {
                AllLifeGroupsContentView(churchRepository: churchRepository)
            }
        }
        .background(PazMeshBackground())
        .navigationTitle("Grupos de Vida")
        .navigationBarTitleDisplayMode(.large)
        .toolbarBackground(.hidden, for: .navigationBar)
    }

    private var myGroupsContent: some View {
        ScrollView {
            VStack(spacing: PazSpacing.md) {
                Spacer().frame(height: PazSpacing.sm)
                ForEach(viewModel.myLifeGroups, id: \.id) { lifeGroup in
                    NavigationLink(destination: LifeGroupDetailView(lifeGroup: lifeGroup)) {
                        LifeGroupCard(lifeGroup: lifeGroup)
                    }
                    .buttonStyle(.plain)
                }

                NavigationLink {
                    AllLifeGroupsContentView(churchRepository: churchRepository)
                        .navigationTitle("Todos os Grupos de Vida")
                        .navigationBarTitleDisplayMode(.inline)
                } label: {
                    HStack(spacing: PazSpacing.md) {
                        Image(systemName: "square.grid.2x2")
                            .foregroundColor(PazColors.accent)
                        Text("Ver mais grupos de vida")
                            .font(PazTypography.titleSmall)
                            .foregroundColor(PazColors.ink)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 14))
                            .foregroundColor(.gray)
                    }
                    .padding(PazSpacing.lg)
                    .glassCard(radius: PazSpacing.cardRadiusCompact)
                }
                .buttonStyle(.plain)

                Spacer().frame(height: PazSpacing.xl)
            }
            .padding(.horizontal, PazSpacing.lg)
        }
        .refreshable { await viewModel.load() }
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
                    .background(PazColors.accent)
                    .cornerRadius(12)
            }
            .padding(.horizontal, PazSpacing.lg)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// The unfiltered, everyone-in-the-church list/map — either the fallback
// when the viewer has no group of their own, or reached via "Ver mais
// grupos de vida".
struct AllLifeGroupsContentView: View {
    @State private var viewModel: AllLifeGroupsViewModel
    @State private var showMap = false
    let churchRepository: ChurchRepository

    init(churchRepository: ChurchRepository) {
        self.churchRepository = churchRepository
        _viewModel = State(initialValue: AllLifeGroupsViewModel(churchRepository: churchRepository))
    }

    private var showsToggle: Bool {
        !viewModel.isLoading && viewModel.error == nil && !viewModel.lifeGroups.isEmpty
    }

    var body: some View {
        Group {
            if viewModel.isLoading {
                loadingState
            } else if let error = viewModel.error {
                errorState(error: error)
            } else if viewModel.lifeGroups.isEmpty {
                emptyState("Nenhum grupo de vida encontrado")
            } else if showMap {
                // Map is edge-to-edge (ignoresSafeArea) so it reads behind the
                // translucent nav bar.
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
                .refreshable { await viewModel.load() }
            }
        }
        .background(PazMeshBackground())
        .toolbar {
            if showsToggle {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showMap.toggle()
                    } label: {
                        Image(systemName: showMap ? "list.bullet" : "map")
                    }
                    .accessibilityLabel(showMap ? "Ver lista" : "Ver mapa")
                }
            }
        }
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
                    .background(PazColors.accent)
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
                        .fill(PazColors.accent.opacity(0.1))
                        .frame(width: 48, height: 48)
                    Image(systemName: "person.fill")
                        .font(.system(size: 18))
                        .foregroundColor(PazColors.accent)
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
                        .foregroundColor(PazColors.accent)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(PazColors.accent.opacity(0.12))
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
        .glassCard(radius: PazSpacing.cardRadiusCompact)
    }
}

@MainActor
@Observable
class LifeGroupsViewModel {
    var myLifeGroups: [LifeGroup] = []
    var isLoading = true
    var error: String?

    private let churchRepository: ChurchRepository

    init(churchRepository: ChurchRepository) {
        self.churchRepository = churchRepository
        Task { await load() }
    }

    func load() async {
        isLoading = true
        do {
            self.myLifeGroups = try await churchRepository.getMyLifeGroups()
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

@MainActor
@Observable
class AllLifeGroupsViewModel {
    var lifeGroups: [LifeGroup] = []
    var isLoading = true
    var error: String?

    private let churchRepository: ChurchRepository

    init(churchRepository: ChurchRepository) {
        self.churchRepository = churchRepository
        Task { await load() }
    }

    func load() async {
        isLoading = true
        do {
            self.lifeGroups = try await churchRepository.getAllLifeGroups()
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
        LifeGroupsView(churchRepository: IosAppContainer.shared.churchRepository)
    }
}
