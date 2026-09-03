import Observation
import Shared
import SwiftUI

// MARK: - ViewModel

@MainActor
@Observable
class SearchViewModel {
    var query = ""
    var results = SearchResults()
    var isSearching = false
    var hasSearched = false

    private let homeRepository: HomeRepository
    private let academyRepository: AcademyRepository
    private let formsRepository: FormsRepository
    private let churchRepository: ChurchRepository

    private var searchTask: Task<Void, Never>?

    init(
        homeRepository: HomeRepository,
        academyRepository: AcademyRepository,
        formsRepository: FormsRepository,
        churchRepository: ChurchRepository
    ) {
        self.homeRepository = homeRepository
        self.academyRepository = academyRepository
        self.formsRepository = formsRepository
        self.churchRepository = churchRepository
    }

    func onQueryChanged(_ newQuery: String) {
        query = newQuery
        searchTask?.cancel()

        if newQuery.trimmingCharacters(in: .whitespaces).isEmpty {
            results = SearchResults()
            hasSearched = false
            isSearching = false
            return
        }

        searchTask = Task {
            try? await Task.sleep(nanoseconds: 300_000_000) // 300ms debounce
            guard !Task.isCancelled else { return }
            await search(newQuery.trimmingCharacters(in: .whitespaces))
        }
    }

    private func search(_ query: String) async {
        isSearching = true
        let lowered = query.lowercased()

        async let homeResult = homeRepository.getHomeContent()
        async let academyResult = academyRepository.getAcademyContent()
        async let formsResult = formsRepository.getCatalog()
        async let churchResult = churchRepository.getChurch()
        async let lifeGroupsResult = churchRepository.getAllLifeGroups()

        let home = try? await homeResult
        let academy = try? await academyResult
        let catalogRaw = try? await formsResult
        let church = try? await churchResult
        let lgRaw = try? await lifeGroupsResult

        let events = ((home?.agenda as? [AgendaEvent]) ?? []).filter {
            $0.title.lowercased().contains(lowered) ||
                ($0.description_?.lowercased().contains(lowered) == true)
        }

        let videos: [AcademyVideo] = []

        let forms = ((catalogRaw as? [FormCatalogItem]) ?? []).filter {
            $0.title.lowercased().contains(lowered) ||
                ($0.description_?.lowercased().contains(lowered) == true)
        }

        let ministries = ((church?.ministries as? [Ministry]) ?? []).filter {
            $0.name.lowercased().contains(lowered) ||
                ($0.description_?.lowercased().contains(lowered) == true)
        }

        let lifeGroups = ((lgRaw as? [LifeGroup]) ?? []).filter {
            $0.name.lowercased().contains(lowered) ||
                ($0.leader?.lowercased().contains(lowered) == true)
        }

        results = SearchResults(
            events: events,
            videos: videos,
            forms: forms,
            ministries: ministries,
            lifeGroups: lifeGroups
        )
        hasSearched = true
        isSearching = false
    }
}

struct SearchResults {
    var events: [AgendaEvent] = []
    var videos: [AcademyVideo] = []
    var forms: [FormCatalogItem] = []
    var ministries: [Ministry] = []
    var lifeGroups: [LifeGroup] = []

    var isEmpty: Bool {
        events.isEmpty && videos.isEmpty && forms.isEmpty && ministries.isEmpty && lifeGroups.isEmpty
    }
}

// MARK: - View

struct SearchView: View {
    @State private var viewModel: SearchViewModel

    init(
        homeRepository: HomeRepository,
        academyRepository: AcademyRepository,
        formsRepository: FormsRepository,
        churchRepository: ChurchRepository
    ) {
        _viewModel = State(initialValue: SearchViewModel(
            homeRepository: homeRepository,
            academyRepository: academyRepository,
            formsRepository: formsRepository,
            churchRepository: churchRepository
        ))
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Hero search header
                VStack(alignment: .leading, spacing: PazSpacing.md) {
                    Text("Buscar")
                        .font(PazTypography.headlineMedium)
                        .foregroundColor(.white)

                    HStack(spacing: PazSpacing.sm) {
                        if viewModel.isSearching {
                            ProgressView()
                                .tint(.white)
                                .frame(width: 20, height: 20)
                        } else {
                            Image(systemName: "magnifyingglass")
                                .foregroundColor(.white.opacity(0.7))
                        }
                        TextField("Eventos, vídeos, formulários...", text: $viewModel.query)
                            .font(PazTypography.bodyMedium)
                            .foregroundColor(.white)
                            .tint(.white)
                            .onChange(of: viewModel.query) { newValue in
                                viewModel.onQueryChanged(newValue)
                            }
                        if !viewModel.query.isEmpty {
                            Button(action: { viewModel.onQueryChanged("") }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.white.opacity(0.7))
                            }
                        }
                    }
                    .padding(.horizontal, PazSpacing.md)
                    .padding(.vertical, PazSpacing.sm)
                    .background(.white.opacity(0.15))
                    .cornerRadius(12)
                }
                .padding(.horizontal, PazSpacing.lg)
                .padding(.vertical, PazSpacing.md)
                .background(PazColors.heroGradient)

                // Results
                if !viewModel.hasSearched, viewModel.query.isEmpty {
                    emptyQueryState
                } else if viewModel.hasSearched, viewModel.results.isEmpty {
                    noResultsState
                } else {
                    resultsList
                }
            }
            .background(PazColors.background)
        }
    }

    private var resultsList: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: PazSpacing.sm) {
                Spacer().frame(height: PazSpacing.sm)

                if !viewModel.results.events.isEmpty {
                    SectionHeaderView(title: "Eventos", count: viewModel.results.events.count)
                    ForEach(viewModel.results.events, id: \.id) { event in
                        NavigationLink(destination: AgendaDetailView(event: event)) {
                            SearchResultRow(icon: "calendar", title: event.title, subtitle: event.startDate)
                        }
                        .buttonStyle(.plain)
                    }
                    Spacer().frame(height: PazSpacing.sm)
                }

                if !viewModel.results.videos.isEmpty {
                    SectionHeaderView(title: "Vídeos", count: viewModel.results.videos.count)
                    ForEach(viewModel.results.videos, id: \.id) { video in
                        SearchResultRow(icon: "play.circle.fill", title: video.title, subtitle: video.category ?? "")
                    }
                    Spacer().frame(height: PazSpacing.sm)
                }

                if !viewModel.results.forms.isEmpty {
                    SectionHeaderView(title: "Formulários", count: viewModel.results.forms.count)
                    ForEach(viewModel.results.forms, id: \.id) { form in
                        NavigationLink(destination: FormDetailView(form: form)) {
                            SearchResultRow(icon: "list.clipboard", title: form.title, subtitle: form.description ?? "")
                        }
                        .buttonStyle(.plain)
                    }
                    Spacer().frame(height: PazSpacing.sm)
                }

                if !viewModel.results.ministries.isEmpty {
                    SectionHeaderView(title: "Ministérios", count: viewModel.results.ministries.count)
                    ForEach(viewModel.results.ministries, id: \.id) { ministry in
                        NavigationLink(destination: MinistryDetailView(ministry: ministry)) {
                            SearchResultRow(
                                icon: "person.3.fill",
                                title: ministry.name,
                                subtitle: ministry.description ?? ""
                            )
                        }
                        .buttonStyle(.plain)
                    }
                    Spacer().frame(height: PazSpacing.sm)
                }

                if !viewModel.results.lifeGroups.isEmpty {
                    SectionHeaderView(title: "Grupos de Vida", count: viewModel.results.lifeGroups.count)
                    ForEach(viewModel.results.lifeGroups, id: \.id) { group in
                        NavigationLink(destination: LifeGroupDetailView(lifeGroup: group)) {
                            SearchResultRow(
                                icon: "person.fill",
                                title: group.name,
                                subtitle: group.leader.map { "Líder: \($0)" } ?? "\(group.membersCount) membros"
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }

                Spacer().frame(height: PazSpacing.xl)
            }
            .padding(.horizontal, PazSpacing.lg)
        }
        .background(PazColors.background)
    }

    private var emptyQueryState: some View {
        VStack {
            Spacer()
            VStack(spacing: PazSpacing.md) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 48))
                    .foregroundColor(.gray.opacity(0.4))
                Text("Busque eventos, vídeos, formulários, ministérios e grupos de vida")
                    .font(PazTypography.bodySmall)
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
            }
            .padding(.horizontal, PazSpacing.xl)
            Spacer()
        }
        .background(PazColors.background)
    }

    private var noResultsState: some View {
        VStack {
            Spacer()
            VStack(spacing: PazSpacing.md) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 48))
                    .foregroundColor(.gray.opacity(0.4))
                Text("Nenhum resultado para \"\(viewModel.query)\"")
                    .font(PazTypography.bodySmall)
                    .foregroundColor(.gray)
            }
            Spacer()
        }
        .background(PazColors.background)
    }
}

private struct SectionHeaderView: View {
    let title: String
    let count: Int

    var body: some View {
        HStack(spacing: PazSpacing.sm) {
            Text(title)
                .font(PazTypography.titleSmall)
            Text("\(count)")
                .font(PazTypography.labelSmall)
                .foregroundColor(PazColors.primary)
                .padding(.horizontal, 8)
                .padding(.vertical, 2)
                .background(PazColors.primary.opacity(0.12))
                .cornerRadius(20)
        }
        .padding(.vertical, PazSpacing.xs)
    }
}

private struct SearchResultRow: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        HStack(spacing: PazSpacing.md) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(PazColors.primary.opacity(0.1))
                    .frame(width: 40, height: 40)
                Image(systemName: icon)
                    .font(.system(size: 18))
                    .foregroundColor(PazColors.primary)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(PazTypography.titleSmall)
                    .lineLimit(1)
                if !subtitle.isEmpty {
                    Text(subtitle)
                        .font(PazTypography.bodySmall)
                        .foregroundColor(.gray)
                        .lineLimit(1)
                }
            }
            Spacer()
        }
        .padding(PazSpacing.md)
        .background(PazColors.surface)
        .cornerRadius(12)
    }
}

#Preview {
    SearchView(
        homeRepository: IosAppContainer.shared.homeRepository,
        academyRepository: IosAppContainer.shared.academyRepository,
        formsRepository: IosAppContainer.shared.formsRepository,
        churchRepository: IosAppContainer.shared.churchRepository
    )
}
