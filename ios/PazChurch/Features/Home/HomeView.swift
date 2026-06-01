import SwiftUI
import Shared

struct HomeView: View {
    @StateObject private var viewModel: HomeViewModel

    init(homeRepository: HomeRepository, authRepository: AuthRepository) {
        _viewModel = StateObject(wrappedValue: HomeViewModel(
            homeRepository: homeRepository,
            authRepository: authRepository
        ))
    }

    var body: some View {
        NavigationStack {
            ZStack {
                if viewModel.isLoading {
                    loadingState
                } else if viewModel.error != nil {
                    errorState
                } else {
                    contentState
                }
            }
            .navigationTitle("Início")
        }
    }

    @ViewBuilder
    private var contentState: some View {
        ScrollView {
            VStack(spacing: PazSpacing.lg) {
                // Hero greeting
                VStack(alignment: .leading, spacing: PazSpacing.sm) {
                    Text("Bem-vindo, \(viewModel.userName)")
                        .font(PazTypography.headlineSmall)
                        .foregroundColor(.white)
                    Text("Que Deus abençoe seu dia")
                        .font(PazTypography.bodySmall)
                        .foregroundColor(.white.opacity(0.8))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(PazSpacing.lg)
                .background(PazColors.heroGradient)
                .cornerRadius(16)
                .padding(.horizontal, PazSpacing.lg)
                .padding(.top, PazSpacing.lg)

                // Banners carousel
                if !(viewModel.homeContent?.banners.isEmpty ?? true) {
                    BannersCarousel(banners: viewModel.homeContent?.banners ?? [])
                        .padding(.horizontal, PazSpacing.lg)
                }

                // Contribution card
                if let contribution = viewModel.homeContent?.contribution {
                    ContributionCard(contribution: contribution)
                        .padding(.horizontal, PazSpacing.lg)
                }

                // Agenda events
                if !(viewModel.homeContent?.agenda.isEmpty ?? true) {
                    VStack(alignment: .leading, spacing: PazSpacing.md) {
                        Text("Próximos Eventos")
                            .font(PazTypography.titleMedium)
                            .padding(.horizontal, PazSpacing.lg)

                        VStack(spacing: PazSpacing.sm) {
                            ForEach(viewModel.homeContent?.agenda.prefix(3) ?? [], id: \.id) { event in
                                NavigationLink(destination: AgendaDetailView(event: event)) {
                                    EventRow(event: event)
                                }
                            }
                        }
                        .padding(.horizontal, PazSpacing.lg)
                    }
                }

                Spacer().frame(height: PazSpacing.xl)
            }
            .background(PazColors.background)
        }
    }

    @ViewBuilder
    private var loadingState: some View {
        ScrollView {
            VStack(spacing: PazSpacing.lg) {
                SkeletonView().frame(height: 100).padding(.horizontal, PazSpacing.lg).padding(.top, PazSpacing.lg)
                SkeletonView().frame(height: 150).padding(.horizontal, PazSpacing.lg)
                SkeletonView().frame(height: 120).padding(.horizontal, PazSpacing.lg)
                Spacer()
            }
        }
    }

    @ViewBuilder
    private var errorState: some View {
        VStack(spacing: PazSpacing.lg) {
            Spacer()
            VStack(spacing: PazSpacing.md) {
                Image(systemName: "exclamationmark.circle")
                    .font(.system(size: 48))
                    .foregroundColor(PazColors.error)

                Text("Erro ao carregar")
                    .font(PazTypography.titleMedium)

                Text(viewModel.error ?? "Algo deu errado")
                    .font(PazTypography.bodySmall)
                    .foregroundColor(.gray)

                Spacer().frame(height: PazSpacing.md)

                Button(action: { viewModel.onRetry() }) {
                    Text("Tentar Novamente")
                        .font(PazTypography.titleMedium)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, PazSpacing.md)
                        .background(PazColors.primary)
                        .cornerRadius(12)
                }
            }
            .padding(PazSpacing.lg)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(PazColors.background)
    }
}

private struct BannersCarousel: View {
    let banners: [Banner]
    @State private var currentIndex = 0

    var body: some View {
        VStack(spacing: PazSpacing.sm) {
            TabView(selection: $currentIndex) {
                ForEach(Array(banners.enumerated()), id: \.element.id) { index, banner in
                    ZStack {
                        Color.blue.opacity(0.2)
                        VStack {
                            Text(banner.title)
                                .font(PazTypography.titleSmall)
                                .foregroundColor(.white)
                            Spacer()
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                        .padding(PazSpacing.lg)
                    }
                    .cornerRadius(12)
                    .tag(index)
                }
            }
            .frame(height: 150)
            .tabViewStyle(.page(indexDisplayMode: .always))

            // Dot indicators
            HStack(spacing: 6) {
                ForEach(0..<banners.count, id: \.self) { index in
                    Circle()
                        .fill(index == currentIndex ? PazColors.primary : Color.gray.opacity(0.3))
                        .frame(width: 8, height: 8)
                }
            }
        }
    }
}

private struct ContributionCard: View {
    let contribution: ContributionSection

    var body: some View {
        VStack(alignment: .leading, spacing: PazSpacing.md) {
            Text("Dízimos & Ofertas")
                .font(PazTypography.titleMedium)

            HStack(spacing: PazSpacing.lg) {
                Button(action: {}) {
                    VStack(spacing: PazSpacing.sm) {
                        Image(systemName: "qrcode")
                            .font(.system(size: 24))
                        Text("PIX")
                            .font(PazTypography.labelSmall)
                    }
                    .foregroundColor(PazColors.primary)
                    .frame(maxWidth: .infinity)
                    .padding(PazSpacing.md)
                    .background(PazColors.primary.opacity(0.1))
                    .cornerRadius(12)
                }

                Button(action: {}) {
                    VStack(spacing: PazSpacing.sm) {
                        Image(systemName: "building.2")
                            .font(.system(size: 24))
                        Text("Banco")
                            .font(PazTypography.labelSmall)
                    }
                    .foregroundColor(PazColors.primary)
                    .frame(maxWidth: .infinity)
                    .padding(PazSpacing.md)
                    .background(PazColors.primary.opacity(0.1))
                    .cornerRadius(12)
                }
            }
        }
        .padding(PazSpacing.lg)
        .background(PazColors.surface)
        .cornerRadius(16)
    }
}

private struct EventRow: View {
    let event: AgendaEvent

    var body: some View {
        HStack(spacing: PazSpacing.md) {
            VStack(alignment: .leading, spacing: PazSpacing.sm) {
                Text(event.title)
                    .font(PazTypography.titleSmall)
                    .lineLimit(1)

                HStack(spacing: PazSpacing.sm) {
                    Image(systemName: "calendar")
                        .font(.system(size: 12))
                    Text(event.startDate)
                        .font(PazTypography.bodySmall)
                }
                .foregroundColor(.gray)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .foregroundColor(.gray)
        }
        .padding(PazSpacing.md)
        .background(PazColors.surface)
        .cornerRadius(12)
    }
}

#Preview {
    HomeView(homeRepository: IosAppContainer.shared.homeRepository, authRepository: IosAppContainer.shared.authRepository)
}
