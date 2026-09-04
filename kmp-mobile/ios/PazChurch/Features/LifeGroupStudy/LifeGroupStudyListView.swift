import Kingfisher
import Shared
import SwiftUI

struct LifeGroupStudyListView: View {
    @State private var viewModel: LifeGroupStudyListViewModel
    @Environment(AuthenticationCoordinator.self) private var authCoordinator
    @State private var showEditor = false

    init(repository: LifeGroupStudyRepository) {
        _viewModel = State(initialValue: LifeGroupStudyListViewModel(repository: repository))
    }

    var body: some View {
        screenContent
            .background(PazColors.background)
            .navigationTitle("Estudo do Life")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                if viewModel.canPublish {
                    ToolbarItem(placement: .primaryAction) {
                        Button { showEditor = true } label: {
                            Image(systemName: "plus")
                        }
                    }
                }
            }
            .sheet(isPresented: $showEditor) {
                NavigationStack {
                    LifeGroupStudyEditorView(
                        studyId: nil,
                        repository: IosAppContainer.shared.lifeGroupStudyRepository,
                        onSaved: {
                            showEditor = false
                            Task { await viewModel.load(currentUser: authCoordinator.currentUser) }
                        },
                        onCancel: { showEditor = false }
                    )
                }
            }
            .task { await viewModel.load(currentUser: authCoordinator.currentUser) }
    }

    @ViewBuilder
    private var screenContent: some View {
        if viewModel.isLoading {
            loadingState
        } else if let error = viewModel.error {
            errorState(message: error)
        } else if viewModel.studies.isEmpty {
            emptyState
        } else {
            contentState
        }
    }

    private var contentState: some View {
        List {
            ForEach(viewModel.studies, id: \.id) { study in
                NavigationLink(value: DeepLinkDestination.lifeGroupStudyDetail(studyId: study.id)) {
                    StudyRow(study: study)
                }
                .listRowSeparator(.hidden)
                .listRowBackground(Color.clear)
            }
            if !viewModel.studies.isEmpty {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .listRowSeparator(.hidden)
                    .listRowBackground(Color.clear)
                    .opacity(viewModel.isLoadingMore ? 1 : 0)
                    .task { await viewModel.loadMore() }
            }
        }
        .listStyle(.plain)
    }

    private var emptyState: some View {
        ContentUnavailableView(
            "Nenhum estudo publicado ainda",
            systemImage: "book.closed",
            description: Text("Os estudos do Life aparecerão aqui assim que forem publicados.")
        )
        .background(PazColors.background)
    }

    private func errorState(message: String) -> some View {
        VStack(spacing: 16) {
            Spacer()
            Text(message).font(PazTypography.bodySmall).foregroundStyle(PazColors.slate).multilineTextAlignment(.center)
            Button("Tentar Novamente") {
                Task { await viewModel.load(currentUser: authCoordinator.currentUser) }
            }
            .font(PazTypography.titleSmall)
            .foregroundStyle(PazColors.pazPrimary)
            Spacer()
        }
        .padding(.horizontal, 24)
    }

    private var loadingState: some View {
        ScrollView {
            VStack(spacing: 16) {
                Spacer().frame(height: 20)
                ForEach(0..<5, id: \.self) { _ in SkeletonView().frame(height: 84).padding(.horizontal, 20) }
                Spacer()
            }
        }
    }
}

private struct StudyRow: View {
    let study: LifeGroupStudy

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                PazColors.featuredCardGradient
                if let urlStr = study.imageUrl, !urlStr.isEmpty, let url = URL(string: urlStr) {
                    KFImage(url)
                        .resizable()
                        .placeholder { Color.clear }
                        .fade(duration: 0.2)
                        .scaledToFill()
                        .clipped()
                } else {
                    Image(systemName: "book.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(.white.opacity(0.7))
                }
            }
            .frame(width: 88, height: 64)
            .clipShape(RoundedRectangle(cornerRadius: 10))

            VStack(alignment: .leading, spacing: 4) {
                Text(study.title).font(PazTypography.titleSmall).foregroundStyle(PazColors.ink).lineLimit(2)
                Text(study.author).font(PazTypography.bodySmall).foregroundStyle(PazColors.slate).lineLimit(1)
            }
            Spacer()
        }
        .padding(12)
        .background(PazColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }
}
