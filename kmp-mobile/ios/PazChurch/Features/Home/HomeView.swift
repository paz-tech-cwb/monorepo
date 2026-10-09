import Kingfisher
import Shared
import SwiftUI
import UIKit

// MARK: - HomeView

struct HomeView: View {
    @State private var viewModel: HomeViewModel
    @State private var currentFeatureIndex: Int = 0
    @State private var scrolledFeatureID: Int? = 0
    @State private var showAgendaList = false
    @State private var autoScrollTimer: Timer?
    @State private var isUserDragging = false
    @Environment(\.colorScheme) private var colorScheme

    private let agendaRepository: AgendaRepository

    init(homeRepository: HomeRepository, authRepository: AuthRepository) {
        let agendaRepository = IosAppContainer.shared.agendaRepository
        _viewModel = State(initialValue: HomeViewModel(
            homeRepository: homeRepository,
            authRepository: authRepository,
            agendaRepository: agendaRepository,
            churchRepository: IosAppContainer.shared.churchRepository
        ))
        self.agendaRepository = agendaRepository
    }

    private var isDark: Bool {
        colorScheme == .dark
    }

    private var banners: [Banner] {
        viewModel.homeContent?.banners ?? []
    }

    private var bank: BankInfo? {
        viewModel.homeContent?.contribution?.bank
    }

    private func parseEventDate(_ str: String) -> Date? {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = iso.date(from: str) { return d }
        iso.formatOptions = [.withInternetDateTime]
        if let d = iso.date(from: str) { return d }
        let fmt = DateFormatter()
        fmt.locale = Locale(identifier: "en_US_POSIX")
        for format in ["yyyy-MM-dd'T'HH:mm", "yyyy-MM-dd"] {
            fmt.dateFormat = format
            if let d = fmt.date(from: str) { return d }
        }
        return nil
    }

    /// Events starting from the start of today through the next 7 days inclusive.
    private var nextSevenDaysEvents: [AgendaEvent] {
        let cal = Calendar.current
        let startOfToday = cal.startOfDay(for: Date())
        guard let sevenDaysOut = cal.date(byAdding: .day, value: 7, to: startOfToday) else { return [] }
        let allEvents = viewModel.homeContent?.agenda ?? []
        return allEvents
            .filter { event in
                guard let eventDate = parseEventDate(event.startDate) else { return false }
                return eventDate >= startOfToday && eventDate < sevenDaysOut
            }
            .sorted { (parseEventDate($0.startDate) ?? .distantFuture) < (parseEventDate($1.startDate) ?? .distantFuture) }
    }

    private var sectionOrder: [String] {
        viewModel.homeContent?.sectionOrder ?? [
            "announcements",
            "contribution",
            "agenda",
        ]
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                if viewModel.isLoading {
                    loadingState
                } else if viewModel.error != nil {
                    errorState
                } else {
                    contentSections
                }

                Spacer()
                    .frame(height: 40)
            }
        }
        .refreshable { await viewModel.load() }
        .background(PazMeshBackground())
        .navigationTitle("Início")
        .navigationBarTitleDisplayMode(.large)
        .toolbarBackground(.hidden, for: .navigationBar)
        .navigationDestination(for: AgendaEvent.self) { event in
            AgendaDetailView(event: event)
        }
        .task {
            await viewModel.load()
        }
        .sheet(isPresented: $showAgendaList) {
            AgendaListView(agendaRepository: agendaRepository)
        }
    }

    // MARK: - Content sections

    private var contentSections: some View {
        VStack(spacing: .zero) {
            ForEach(Array(sectionOrder.enumerated()), id: \.offset) { index, type in
                let delay = Double(index) * 0.065
                switch type {
                case "announcements" where !banners.isEmpty:
                    featuredSection
                        .padding(.top, 8)
                        .transition(.opacity.combined(with: .move(edge: .bottom)))
                        .animation(.spring(response: 0.6, dampingFraction: 0.8).delay(delay), value: banners.count)

                case "agenda":
                    agendaSection
                        .transition(.opacity.combined(with: .move(edge: .bottom)))
                        .animation(.spring(response: 0.6, dampingFraction: 0.8).delay(delay), value: nextSevenDaysEvents.count)

                case "contribution":
                    if let bank {
                        dizimosCard(bank: bank)
                            .padding(.top, 32)
                            .transition(.opacity.combined(with: .move(edge: .bottom)))
                            .animation(.spring(response: 0.6, dampingFraction: 0.8).delay(delay), value: banners.count)
                    }

                default:
                    EmptyView()
                }
            }

            if viewModel.showLifeGroupDiscoveryCTA {
                lifeGroupDiscoveryCard
                    .padding(.top, 32)
            }
        }
    }

    // MARK: - Life group discovery CTA

    private var lifeGroupDiscoveryCard: some View {
        NavigationLink {
            AllLifeGroupsContentView(churchRepository: IosAppContainer.shared.churchRepository)
                .navigationTitle("Todos os Life Groups")
                .navigationBarTitleDisplayMode(.inline)
        } label: {
            VStack(alignment: .leading, spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("LIFE GROUPS")
                        .font(PazTypography.labelMedium)
                        .foregroundStyle(PazColors.accent.opacity(0.7))

                    Text("Encontre um grupo perto de você")
                        .font(.system(size: 24, weight: .heavy))
                        .foregroundStyle(PazColors.ink)
                }

                Text("Você ainda não faz parte de um Life Group. Veja no mapa os grupos mais próximos e comece a participar.")
                    .font(PazTypography.bodySmall)
                    .foregroundStyle(PazColors.ink.opacity(0.7))
                    .lineSpacing(2)

                HStack(spacing: 6) {
                    Image(systemName: "map.fill")
                    Text("Ver Life Groups")
                }
                .font(PazTypography.titleMedium)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: PazSpacing.pillButtonHeight)
                .background {
                    Capsule().fill(PazMaterial.glass(for: colorScheme))
                    Capsule().fill(PazColors.accent.opacity(0.78))
                }
                .clipShape(Capsule())
                .padding(.top, 10)
            }
            .padding(16)
            .background(PazMaterial.glass(for: colorScheme))
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .padding(.horizontal, 16)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Featured section

    private var featuredSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: PazSpacing.xl * 2.5) {
                ForEach(Array(banners.enumerated()), id: \.offset) { index, banner in
                    FeaturedCardView(
                        title: banner.title,
                        imageUrl: banner.imageUrl,
                        isAlt: index % 2 == 1
                    )
                    // Card width narrower than the scroll content margins below
                    // (32pt) so a real, visible strip of the next/previous card's
                    // color and rounded corner stays on-screen at rest — matching
                    // width to margins exactly (as an earlier attempt did) makes
                    // the card fill the inset viewport with zero peek.
                    .frame(width: UIScreen.main.bounds.width - 88)
                    .frame(height: 180)
                    .id(index)
                }
            }
            .scrollTargetLayout()
        }
        .contentMargins(.horizontal, 32, for: .scrollContent)
        .contentMargins(.vertical, 16, for: .scrollContent)
        .scrollTargetBehavior(.viewAligned)
        .scrollPosition(id: $scrolledFeatureID)
        .frame(height: 212)
        .onAppear { startAutoScroll() }
        .onDisappear { stopAutoScroll() }
        .onChange(of: currentFeatureIndex) { _, _ in
            if isUserDragging { resetAutoScroll() }
        }
        .simultaneousGesture(
            DragGesture()
                .onChanged { _ in isUserDragging = true }
                .onEnded { _ in
                    isUserDragging = false
                    resetAutoScroll()
                }
        )
    }

    private func startAutoScroll() {
        guard banners.count > 1 else { return }
        autoScrollTimer = Timer.scheduledTimer(withTimeInterval: 3, repeats: true) { _ in
            let next = (currentFeatureIndex + 1) % banners.count
            withAnimation(.easeInOut) {
                currentFeatureIndex = next
                scrolledFeatureID = next
            }
        }
    }

    private func stopAutoScroll() {
        autoScrollTimer?.invalidate()
        autoScrollTimer = nil
    }

    private func resetAutoScroll() {
        stopAutoScroll()
        startAutoScroll()
    }

    // MARK: - Dízimos card

    private func dizimosCard(bank: BankInfo) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header sits directly on the frosted card now — no solid
            // brand-color block behind it.
            VStack(alignment: .leading, spacing: 4) {
                Text("DÍZIMOS & OFERTAS")
                    .font(PazTypography.labelMedium)
                    .foregroundStyle(PazColors.accent.opacity(0.7))

                Text("Contribua com a visão")
                    .font(.system(size: 24, weight: .heavy))
                    .foregroundStyle(PazColors.ink)
            }

            // Subtitle + the single PIX action, on the frosted outer surface.
            VStack(alignment: .leading, spacing: 0) {
                Text("Sua oferta transforma vidas na comunidade")
                    .font(PazTypography.bodySmall)
                    .foregroundStyle(PazColors.ink.opacity(0.7))
                    .lineSpacing(2)

                if bank.pixKey != nil {
                    DizimosPixButton(pixKey: bank.pixKey)
                        .padding(.top, 10)
                }
            }
        }
        .padding(16)
        .background(PazMaterial.glass(for: colorScheme))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .padding(.horizontal, 16)
    }

    // MARK: - Agenda section

    private var agendaSection: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Agenda")
                    .font(.system(size: 23, weight: .heavy))
                    .foregroundStyle(PazColors.ink)
                Spacer()
                Button(action: { showAgendaList = true }) {
                    HStack(spacing: 5) {
                        Text("Ver tudo").font(PazTypography.labelSmall)
                        Image(systemName: "arrow.right").font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundStyle(PazColors.accent)
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 13)

            let eventsToShow = viewModel.isAgendaExpanded ? viewModel.fullAgendaEvents : nextSevenDaysEvents

            if !viewModel.isAgendaExpanded, nextSevenDaysEvents.isEmpty {
                // No events in the next 7 days — keep only the entry point to
                // the full agenda ("Ver tudo" above), without the detailed
                // week-list view or expand toggle.
                Spacer().frame(height: 4)
            } else {
                if viewModel.isAgendaExpanded, viewModel.isLoadingFullAgenda {
                    VStack(spacing: 12) {
                        ForEach(0..<3, id: \.self) { _ in
                            HomeSkeletonView().frame(height: 60)
                        }
                    }
                    .padding(.horizontal, 16)
                } else if viewModel.isAgendaExpanded, let fullAgendaLoadError = viewModel.fullAgendaLoadError {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Não foi possível carregar a agenda completa.")
                            .font(PazTypography.bodyMedium)
                            .foregroundStyle(PazColors.ink)
                        Button(action: { Task { await viewModel.loadFullAgenda() } }) {
                            Text("Tentar novamente")
                                .font(PazTypography.labelMedium)
                                .foregroundStyle(PazColors.accent)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(16)
                    .background(PazColors.surface, in: RoundedRectangle(cornerRadius: 14))
                    .padding(.horizontal, 16)
                } else {
                    VStack(spacing: 12) {
                        ForEach(eventsToShow, id: \.id) { event in
                            EventCardView(event: event)
                        }
                    }
                    .padding(.horizontal, 16)
                }

                Button(action: { withAnimation { viewModel.onToggleAgendaExpanded() } }) {
                    Text(viewModel.isAgendaExpanded ? "Ver menos" : "Ver próximos eventos")
                        .font(PazTypography.labelMedium)
                        .foregroundStyle(PazColors.accent)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
            }
        }
    }

    // MARK: - Loading / Error states

    private var loadingState: some View {
        VStack(spacing: PazSpacing.lg) {
            HomeSkeletonView().frame(height: 176).padding(.horizontal, PazSpacing.lg).padding(.top, PazSpacing.lg)
            HomeSkeletonView().frame(height: 130).padding(.horizontal, PazSpacing.lg)
            HomeSkeletonView().frame(height: 80).padding(.horizontal, PazSpacing.lg)
            HomeSkeletonView().frame(height: 80).padding(.horizontal, PazSpacing.lg)
            HomeSkeletonView().frame(height: 80).padding(.horizontal, PazSpacing.lg)
        }
        .padding(.top, PazSpacing.xl)
    }

    private var errorState: some View {
        ErrorStateView(message: viewModel.error ?? "Algo deu errado", onRetry: { viewModel.onRetry() })
    }
}

// MARK: - FeaturedCardView

private struct FeaturedCardView: View {
    let title: String
    let imageUrl: String
    let isAlt: Bool

    private var gradient: LinearGradient {
        isAlt ? PazColors.featuredCardGradient : PazColors.featuredCardGradientAlt
    }

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            if !imageUrl.isEmpty, let url = URL(string: imageUrl) {
                KFImage(url)
                    .resizable()
                    .placeholder { gradient }
                    .fade(duration: 0.2)
                    .scaledToFill()
                    .overlay(
                        LinearGradient(
                            colors: [.clear, .black.opacity(0.6)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
            } else {
                gradient

                CrossWatermarkView()
                    .frame(width: 158, height: 158)
                    .opacity(0.08)
                    .rotationEffect(.degrees(-9))
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                    .offset(x: 14, y: 30)
                    .clipped()
            }

            VStack(alignment: .leading, spacing: 0) {
                Spacer()
                Text(title)
                    .font(.system(size: 23, weight: .heavy))
                    .foregroundStyle(.white)
                    .lineLimit(2)
            }
            .padding(18)
        }
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .contentShape(RoundedRectangle(cornerRadius: 22))
    }
}

// MARK: - CrossWatermarkView

private struct CrossWatermarkView: View {
    var body: some View {
        Canvas { ctx, size in
            let sx = size.width / 24
            let sy = size.height / 24
            var path = Path()
            path.move(to: .init(x: 10.6 * sx, y: 2.5 * sy))
            path.addLine(to: .init(x: 13.4 * sx, y: 2.5 * sy))
            path.addLine(to: .init(x: 13.4 * sx, y: 6.7 * sy))
            path.addLine(to: .init(x: 18 * sx, y: 6.7 * sy))
            path.addLine(to: .init(x: 18 * sx, y: 9.5 * sy))
            path.addLine(to: .init(x: 13.4 * sx, y: 9.5 * sy))
            path.addLine(to: .init(x: 13.4 * sx, y: 21.5 * sy))
            path.addLine(to: .init(x: 10.6 * sx, y: 21.5 * sy))
            path.addLine(to: .init(x: 10.6 * sx, y: 9.5 * sy))
            path.addLine(to: .init(x: 6 * sx, y: 9.5 * sy))
            path.addLine(to: .init(x: 6 * sx, y: 6.7 * sy))
            path.addLine(to: .init(x: 10.6 * sx, y: 6.7 * sy))
            path.closeSubpath()
            ctx.fill(path, with: .color(.white))
        }
    }
}

// MARK: - DizimosPixButton

private struct DizimosPixButton: View {
    let pixKey: String?
    @State private var copied = false

    var body: some View {
        Button {
            guard let pixKey else { return }
            UIPasteboard.general.string = pixKey
            withAnimation(.easeInOut(duration: 0.2)) { copied = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                withAnimation(.easeInOut(duration: 0.2)) { copied = false }
            }
        } label: {
            HStack(spacing: 8) {
                Image(systemName: copied ? "checkmark" : "doc.on.doc.fill")
                Text(copied ? "Copiado!" : "Copiar PIX").font(PazTypography.titleMedium)
            }
        }
        .buttonStyle(.pazPillPrimary)
    }
}

// MARK: - EventCardView

private struct EventCardView: View {
    let event: AgendaEvent

    private var time: String {
        guard let part = event.startDate.split(separator: "T").last else { return "--:--" }
        return String(part.prefix(5))
    }

    var body: some View {
        NavigationLink(value: event) {
            HStack(spacing: 13) {
                Text(time)
                    .font(.system(size: 15.5, weight: .bold))
                    .foregroundStyle(PazColors.accent)
                    .frame(width: 50, alignment: .leading)

                ZStack {
                    Circle().fill(PazColors.tint).frame(width: 18, height: 18)
                    Circle().fill(PazColors.accent).frame(width: 10, height: 10)
                }

                VStack(alignment: .leading, spacing: 3) {
                    Text(event.title)
                        .font(.system(size: 15.5, weight: .bold))
                        .foregroundStyle(PazColors.ink)
                        .lineLimit(1)

                    if let loc = event.location, !loc.isEmpty {
                        HStack(spacing: 5) {
                            Image(systemName: "mappin.fill")
                                .font(.system(size: 10))
                                .foregroundStyle(PazColors.pazCoral)
                            Text(loc)
                                .font(PazTypography.bodySmall)
                                .foregroundStyle(PazColors.slate)
                        }
                    }
                }

                Spacer()
            }
            .padding(15)
            .glassCard(radius: PazSpacing.cardRadiusCompact)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - HomeSkeletonView

private struct HomeSkeletonView: View {
    @State private var animating = false
    var body: some View {
        RoundedRectangle(cornerRadius: 12)
            .fill(
                LinearGradient(
                    colors: [Color.gray.opacity(0.15), Color.gray.opacity(0.25), Color.gray.opacity(0.15)],
                    startPoint: animating ? .leading : .trailing,
                    endPoint: animating ? .trailing : .leading
                )
            )
            .onAppear {
                withAnimation(.linear(duration: 1.2).repeatForever(autoreverses: false)) {
                    animating = true
                }
            }
    }
}

#Preview {
    HomeView(
        homeRepository: IosAppContainer.shared.homeRepository,
        authRepository: IosAppContainer.shared.authRepository
    )
}
