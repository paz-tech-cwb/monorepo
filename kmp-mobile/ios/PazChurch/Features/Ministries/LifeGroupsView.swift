import Observation
import Shared
import SwiftUI

/// Defaults to just the viewer's own life group(s) — leaders/members of at
/// least one group don't need to browse the whole church's list to find
/// their own. "Ver mais life groups" opens the unfiltered list/map for
/// anyone who wants to browse others. A viewer with no group of their own
/// sees the unfiltered list/map immediately, same as before this change.
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
        .navigationTitle("Life Groups")
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
                        .navigationTitle("Todos os Life Groups")
                        .navigationBarTitleDisplayMode(.inline)
                } label: {
                    HStack(spacing: PazSpacing.md) {
                        Image(systemName: "square.grid.2x2")
                            .foregroundColor(PazColors.accent)
                        Text("Ver mais life groups")
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
        ErrorStateView(message: error, onRetry: { viewModel.onRetry() })
    }
}

enum LifeGroupSortOption: String, CaseIterable, Identifiable {
    case name = "Nome"
    case distance = "Distância"

    var id: String { rawValue }
}

/// The unfiltered, everyone-in-the-church list/map — either the fallback
/// when the viewer has no group of their own, or reached via "Ver mais
/// life groups".
struct AllLifeGroupsContentView: View {
    @State private var viewModel: AllLifeGroupsViewModel
    @State private var showMap = false
    @State private var locationProvider = LocationProvider()
    @State private var searchText = ""
    @State private var kidsSpaceOnly = false
    @State private var sortOption: LifeGroupSortOption = .name
    /// Debounces `searchText` → repository calls so every keystroke doesn't
    /// fire a network request.
    @State private var searchTask: Task<Void, Never>?
    /// Drives the collapsing/sticky reveal of `searchBar` as the list
    /// scrolls — the search field itself stays mounted at all times (never
    /// conditionally removed) so a debounced search reload never loses
    /// keyboard focus; only its wrapping container's height/opacity animate.
    @State private var isSearchBarVisible = true

    let churchRepository: ChurchRepository

    init(churchRepository: ChurchRepository) {
        self.churchRepository = churchRepository
        _viewModel = State(initialValue: AllLifeGroupsViewModel(churchRepository: churchRepository))
    }

    private var showsToggle: Bool {
        !viewModel.isLoading && viewModel.error == nil && !viewModel.lifeGroups.isEmpty
    }

    private var hasLocation: Bool {
        locationProvider.coordinate != nil
    }

    /// Geocoded groups (both lat/lng present), used when the view is sorted
    /// by distance so they can be ranked ahead of non-geocoded groups rather
    /// than having "unknown distance" silently coerced to "farthest away".
    private var geocodedGroups: [LifeGroup] {
        baseFilteredGroups.filter { $0.latitude != nil && $0.longitude != nil }
    }

    private var nonGeocodedGroups: [LifeGroup] {
        baseFilteredGroups.filter { $0.latitude == nil || $0.longitude == nil }
    }

    private var baseFilteredGroups: [LifeGroup] {
        var groups = viewModel.lifeGroups
        if kidsSpaceOnly {
            groups = groups.filter { $0.kidsCount > 0 }
        }
        return groups
    }

    private var displayedGroups: [LifeGroup] {
        switch sortOption {
        case .name:
            return baseFilteredGroups.sorted {
                $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
            }
        case .distance:
            guard let userCoordinate = locationProvider.coordinate else { return baseFilteredGroups }
            let userLat = KotlinDouble(value: userCoordinate.latitude)
            let userLon = KotlinDouble(value: userCoordinate.longitude)
            let sortedGeocoded = geocodedGroups.sorted { (lhs: LifeGroup, rhs: LifeGroup) in
                let d1 = LifeGroupDistanceKt.haversineDistanceKm(
                    lat1: userLat, lon1: userLon,
                    lat2: lhs.latitude, lon2: lhs.longitude
                )?.doubleValue ?? .greatestFiniteMagnitude
                let d2 = LifeGroupDistanceKt.haversineDistanceKm(
                    lat1: userLat, lon1: userLon,
                    lat2: rhs.latitude, lon2: rhs.longitude
                )?.doubleValue ?? .greatestFiniteMagnitude
                return d1 < d2
            }
            // Non-geocoded groups are appended after, distinctly from being
            // interleaved as if they were just "very far away" — the card
            // itself also marks them so the distinction is visible in the UI.
            return sortedGeocoded + nonGeocodedGroups
        }
    }

    private func distanceKm(to lifeGroup: LifeGroup) -> Double? {
        guard sortOption == .distance, let userCoordinate = locationProvider.coordinate else { return nil }
        return LifeGroupDistanceKt.haversineDistanceKm(
            lat1: KotlinDouble(value: userCoordinate.latitude),
            lon1: KotlinDouble(value: userCoordinate.longitude),
            lat2: lifeGroup.latitude, lon2: lifeGroup.longitude
        )?.doubleValue
    }

    var body: some View {
        Group {
            if viewModel.isLoading {
                loadingState
            } else if let error = viewModel.error, !viewModel.hasLoadedOnce {
                errorState(error: error)
            } else if showMap {
                // Map is edge-to-edge (ignoresSafeArea) so it reads behind the
                // translucent nav bar — intentionally without the filter bar,
                // same as before this fix; only the list mode's zero-result
                // search needed the filter bar kept alive.
                LifeGroupsMapView(lifeGroups: displayedGroups, locationProvider: locationProvider)
            } else {
                VStack(spacing: 0) {
                    // Always mounted (see `isSearchBarVisible` doc comment) —
                    // only its height/opacity are animated on scroll.
                    searchBar
                        .frame(maxHeight: isSearchBarVisible ? nil : 0)
                        .opacity(isSearchBarVisible ? 1 : 0)
                        .clipped()
                        .animation(.easeInOut(duration: 0.2), value: isSearchBarVisible)

                    if let error = viewModel.error {
                        inlineError(error)
                    } else if viewModel.isSearching {
                        searchLoadingState
                    } else if viewModel.lifeGroups.isEmpty {
                        emptyState("Nenhum life group encontrado")
                    } else if displayedGroups.isEmpty {
                        emptyState("Nenhum life group encontrado para esse filtro")
                    } else {
                        ScrollView {
                            VStack(spacing: PazSpacing.md) {
                                Spacer().frame(height: PazSpacing.sm)
                                ForEach(displayedGroups, id: \.id) { lifeGroup in
                                    NavigationLink(destination: LifeGroupDetailView(lifeGroup: lifeGroup)) {
                                        LifeGroupCard(
                                            lifeGroup: lifeGroup,
                                            distanceKm: distanceKm(to: lifeGroup),
                                            isSortedByDistance: sortOption == .distance && hasLocation
                                        )
                                    }
                                    .buttonStyle(.plain)
                                }
                                Spacer().frame(height: PazSpacing.xl)
                            }
                            .padding(.horizontal, PazSpacing.lg)
                        }
                        .onScrollGeometryChange(for: CGFloat.self) { geometry in
                            geometry.contentOffset.y
                        } action: { _, newOffset in
                            // Dead band between the show/hide thresholds avoids flicker when
                            // the scroll offset hovers right around a single bare cutoff.
                            if newOffset < 8 {
                                isSearchBarVisible = true
                            } else if newOffset > 24 {
                                isSearchBarVisible = false
                            }
                        }
                        .refreshable { await viewModel.load(search: searchText) }
                    }
                }
            }
        }
        .background(PazMeshBackground())
        .task {
            locationProvider.requestAuthorization()
        }
        .onDisappear {
            searchTask?.cancel()
        }
        .onChange(of: hasLocation) { _, nowHasLocation in
            if !nowHasLocation { sortOption = .name }
        }
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

                ToolbarItem(placement: .topBarTrailing) {
                    // "Com crianças" filter + sort, relocated next to the
                    // map toggle rather than living in the (now
                    // scroll-collapsible) search header.
                    Menu {
                        Toggle("Com crianças", isOn: $kidsSpaceOnly)

                        Picker("Ordenar", selection: $sortOption) {
                            ForEach(availableSortOptions) { option in
                                Text(option.rawValue).tag(option)
                            }
                        }
                    } label: {
                        Image(systemName: "line.3.horizontal.decrease.circle\(kidsSpaceOnly ? ".fill" : "")")
                    }
                    .accessibilityLabel("Filtrar e ordenar")
                }
            }
        }
    }

    /// Only offers "Distância" once a location is actually available — a
    /// `.menu`-style `Picker`'s `.disabled()` on an individual option doesn't
    /// actually block selection on iOS, so the option is removed from the
    /// list entirely rather than shown-but-disabled.
    private var availableSortOptions: [LifeGroupSortOption] {
        hasLocation ? LifeGroupSortOption.allCases : [.name]
    }

    /// Search field + the `hasLocation` hint — the "Com crianças" filter and
    /// sort control now live in the toolbar next to the map toggle (see
    /// `.toolbar` above). Kept mounted at all times; the caller animates its
    /// height/opacity on scroll instead of unmounting it, so a debounced
    /// search reload never loses keyboard focus.
    private var searchBar: some View {
        VStack(spacing: PazSpacing.sm) {
            HStack(spacing: PazSpacing.sm) {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.gray)
                    .accessibilityHidden(true)
                TextField("Buscar por nome ou líder", text: $searchText)
                    .textFieldStyle(.plain)
                    .onChange(of: searchText) { _, newValue in
                        searchTask?.cancel()
                        searchTask = Task {
                            try? await Task.sleep(nanoseconds: 400_000_000)
                            if Task.isCancelled { return }
                            await viewModel.load(search: newValue)
                        }
                    }
                if !searchText.isEmpty {
                    Button {
                        searchText = ""
                        searchTask?.cancel()
                        searchTask = Task { await viewModel.load(search: "") }
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.gray)
                    }
                    .accessibilityLabel("Limpar busca")
                }
            }
            .padding(PazSpacing.md)
            .glassCard(radius: PazSpacing.cardRadiusCompact)

            if !hasLocation {
                Text("Ative a localização para ordenar por distância")
                    .font(PazTypography.labelSmall)
                    .foregroundColor(.gray)
                    .padding(.horizontal, PazSpacing.xs)
            }
        }
        .padding(.horizontal, PazSpacing.lg)
        .padding(.top, PazSpacing.sm)
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

    /// Lightweight in-place indicator for a debounced search reload — unlike
    /// `loadingState`, this never replaces `filterBar`, so the TextField
    /// keeps focus and the keyboard stays up while typing.
    private var searchLoadingState: some View {
        VStack {
            Spacer()
            ProgressView()
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    /// A search-triggered error renders inline, below the still-mounted
    /// `filterBar`, rather than tearing down the whole screen.
    private func inlineError(_ error: String) -> some View {
        VStack {
            Spacer()
            Text(error)
                .font(PazTypography.bodySmall)
                .foregroundColor(.gray)
            Button("Tentar novamente") { viewModel.onRetry() }
                .font(PazTypography.labelSmall)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func errorState(error: String) -> some View {
        ErrorStateView(message: error, onRetry: { viewModel.onRetry() })
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
    /// Only set when the list is sorted by distance — `.some(km)` for a
    /// geocoded group, `nil` otherwise. Used only to decide whether to show
    /// distance-related info at all; see `isSortedByDistance`.
    var distanceKm: Double? = nil
    /// True whenever the active sort is "Distância", regardless of whether
    /// THIS card has coordinates — lets a non-geocoded card show "location
    /// unavailable" instead of just omitting the row silently.
    var isSortedByDistance: Bool = false

    private var isMissingLocation: Bool {
        lifeGroup.latitude == nil || lifeGroup.longitude == nil
    }

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
                    if let distanceKm {
                        Text(String(format: "%.1f km", distanceKm))
                            .font(PazTypography.labelSmall)
                            .foregroundColor(.gray)
                    } else if isSortedByDistance, isMissingLocation {
                        Text("Localização não disponível")
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
    /// True only for the very first load, before the filter bar has ever
    /// rendered — drives the full-screen skeleton.
    var isLoading = true
    /// True while a debounced search reload is in flight — the filter bar
    /// stays mounted and only the content below it reflects this.
    var isSearching = false
    var error: String?

    /// Remembers the last search term so `onRetry()` (triggered from the
    /// inline error after a search-triggered failure) retries WITH the
    /// user's current search rather than silently discarding it.
    private var lastSearch: String?
    /// True once a load (initial or search) has ever completed — exposed so
    /// the view can distinguish "genuine first-load failure" (full-screen
    /// error, filter bar never shown) from any subsequent failure (inline
    /// error, filter bar stays mounted).
    private(set) var hasLoadedOnce = false
    /// Incremented each time a new load is kicked off; lets `load()` detect
    /// and discard a stale response if a newer search has started in the
    /// meantime, since task cancellation alone can't abort an in-flight
    /// network call.
    private var searchGeneration = 0

    private let churchRepository: ChurchRepository

    init(churchRepository: ChurchRepository) {
        self.churchRepository = churchRepository
        Task { await load() }
    }

    /// `search` is forwarded to the backend (name/leader/co-leader match);
    /// kids-space filtering and sort stay client-side in the view since they
    /// only reorder/narrow what's already loaded.
    func load(search: String? = nil) async {
        let isInitialLoad = !hasLoadedOnce
        self.error = nil
        if isInitialLoad {
            isLoading = true
        } else {
            isSearching = true
        }
        searchGeneration += 1
        let generation = searchGeneration
        do {
            let results = try await churchRepository.getAllLifeGroups(search: search)
            guard generation == searchGeneration else { return }
            self.lifeGroups = results
            self.error = nil
            self.lastSearch = search
            hasLoadedOnce = true
        } catch {
            guard generation == searchGeneration else { return }
            self.error = "Erro ao carregar dados"
            self.lastSearch = search
        }
        guard generation == searchGeneration else { return }
        self.isLoading = false
        self.isSearching = false
    }

    func onRetry() {
        Task { await load(search: lastSearch) }
    }
}

#Preview {
    NavigationStack {
        LifeGroupsView(churchRepository: IosAppContainer.shared.churchRepository)
    }
}
