import Kingfisher
import Shared
import SwiftUI

// MARK: - HomeView

struct HomeView: View {
    @State private var viewModel: HomeViewModel
    @State private var selectedDayIndex: Int = 2
    @State private var currentFeatureIndex: Int = 0
    @State private var scrolledFeatureID: Int? = 0
    @State private var showAgendaList = false
    @State private var autoScrollTimer: Timer?
    @State private var isUserDragging = false
    @Environment(\.colorScheme) private var colorScheme

    private let agendaRepository: AgendaRepository

    init(homeRepository: HomeRepository, authRepository: AuthRepository) {
        _viewModel = State(initialValue: HomeViewModel(
            homeRepository: homeRepository,
            authRepository: authRepository
        ))
        agendaRepository = IosAppContainer.shared.agendaRepository
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

    private var agendaEvents: [AgendaEvent] {
        Array((viewModel.homeContent?.agenda ?? []).prefix(3))
    }

    private struct WeekDay {
        let date: Date
        let dow: String
        let day: Int
        let isToday: Bool
        var hasEvent: Bool = false
    }

    private var weekDays: [WeekDay] {
        let cal = Calendar.current
        let today = Date()
        guard let weekInterval = cal.dateInterval(of: .weekOfYear, for: today) else { return [] }
        let dowLabels = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"]
        let allEvents = viewModel.homeContent?.agenda ?? []
        return (0..<7).compactMap { offset -> WeekDay? in
            guard let date = cal.date(byAdding: .day, value: offset, to: weekInterval.start) else { return nil }
            let comps = cal.dateComponents([.weekday, .day], from: date)
            let isToday = cal.isDateInToday(date)
            let hasEvent = allEvents.contains { event in
                guard let eventDate = parseEventDate(event.startDate) else { return false }
                return cal.isDate(eventDate, inSameDayAs: date)
            }
            return WeekDay(
                date: date,
                dow: dowLabels[(comps.weekday ?? 1) - 1],
                day: comps.day ?? 0,
                isToday: isToday,
                hasEvent: hasEvent
            )
        }
    }

    private var weekHasEvents: Bool {
        weekDays.contains { $0.hasEvent }
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

    private var selectedDayEvents: [AgendaEvent] {
        guard weekDays.indices.contains(selectedDayIndex) else { return [] }
        let selectedDate = weekDays[selectedDayIndex].date
        let cal = Calendar.current
        return (viewModel.homeContent?.agenda ?? []).filter { event in
            guard let eventDate = parseEventDate(event.startDate) else { return false }
            return cal.isDate(eventDate, inSameDayAs: selectedDate)
        }
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
        .background(PazColors.background)
        .navigationTitle("Início")
        .navigationBarTitleDisplayMode(.large)
        .navigationDestination(for: AgendaEvent.self) { event in
            AgendaDetailView(event: event)
        }
        .task {
            await viewModel.load()
            let cal = Calendar.current
            if let todayIndex = weekDays.firstIndex(where: { cal.isDateInToday($0.date) }) {
                selectedDayIndex = todayIndex
            }
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

                case "agenda" where !(viewModel.homeContent?.agenda ?? []).isEmpty:
                    agendaSection
                        .transition(.opacity.combined(with: .move(edge: .bottom)))
                        .animation(.spring(response: 0.6, dampingFraction: 0.8).delay(delay), value: agendaEvents.count)

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
        }
    }

    // MARK: - Featured section

    private var featuredSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: PazSpacing.lg) {
                ForEach(Array(banners.enumerated()), id: \.offset) { index, banner in
                    FeaturedCardView(
                        title: banner.title,
                        imageUrl: banner.imageUrl,
                        isAlt: index % 2 == 1
                    )
                    .frame(width: UIScreen.main.bounds.width - 64)
                    .frame(height: 180)
                    .id(index)
                }
            }
            .scrollTargetLayout()
            .padding(.bottom, 20)
        }
        .contentMargins(.horizontal, 32, for: .scrollContent)
        .contentMargins(.vertical, 16, for: .scrollContent)
        .scrollTargetBehavior(.viewAligned)
        .scrollPosition(id: $scrolledFeatureID)
        .frame(height: 220)
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
        ZStack(alignment: .topLeading) {
            RadialGradient(
                colors: PazColors.dizimosCardGradientColors,
                center: UnitPoint(x: 0.82, y: -0.08),
                startRadius: 0,
                endRadius: 400
            )

            VStack(alignment: .leading, spacing: 0) {
                Text("DÍZIMOS & OFERTAS")
                    .font(PazTypography.labelSmall)
                    .foregroundStyle(.white.opacity(0.6))

                Text("Contribua com a visão")
                    .font(.system(size: 27, weight: .heavy))
                    .foregroundStyle(.white)
                    .padding(.top, 9)

                Text("Sua oferta transforma vidas na comunidade")
                    .font(PazTypography.bodyMedium)
                    .foregroundStyle(.white.opacity(0.7))
                    .lineSpacing(4)
                    .padding(.top, 7)

                HStack(spacing: 11) {
                    if bank.pixKey != nil {
                        DizimosButtonView(label: "PIX", primary: true)
                    }
                    DizimosButtonView(label: "Cartão", primary: false)
                }
                .padding(.top, 18)
            }
            .padding(22)
        }
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .shadow(color: PazColors.pazPrimary.opacity(0.65), radius: 21, x: 0, y: 22)
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
                    .foregroundStyle(PazColors.pazPrimaryLight)
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 13)

            if weekHasEvents {
                // Sticky week strip — scrollable, partial peek reveals continuity
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: PazSpacing.sm) {
                        ForEach(Array(weekDays.enumerated()), id: \.offset) { index, item in
                            DayPillView(
                                dow: item.dow,
                                day: item.day,
                                isSelected: index == selectedDayIndex,
                                isToday: item.isToday,
                                hasEvent: item.hasEvent
                            )
                            .frame(width: 52)
                            .onTapGesture {
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                    selectedDayIndex = index
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 18)
                    .padding(.vertical, 12)
                }
                .padding(.bottom, 4)
            } else {
                Spacer().frame(height: 8)
            }

            // Event list filtered to selected day
            if selectedDayEvents.isEmpty {
                EmptyAgendaView(
                    hasUpcomingEvents: !(viewModel.homeContent?.agenda ?? []).isEmpty,
                    onSeeAll: { showAgendaList = true }
                )
                .padding(.horizontal, 16)
                .padding(.top, 8)
            } else {
                VStack(spacing: 12) {
                    ForEach(selectedDayEvents, id: \.id) { event in
                        EventCardView(event: event)
                    }
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
        VStack(spacing: PazSpacing.md) {
            Spacer().frame(height: 60)
            Image(systemName: "exclamationmark.circle")
                .font(.system(size: 48))
                .foregroundStyle(PazColors.error)
            Text("Erro ao carregar").font(PazTypography.titleMedium)
            Text(viewModel.error ?? "Algo deu errado")
                .font(PazTypography.bodySmall).foregroundStyle(.secondary)
            Button(action: { viewModel.onRetry() }) {
                Text("Tentar Novamente")
                    .font(PazTypography.titleMedium).foregroundStyle(.white)
                    .frame(maxWidth: .infinity).padding(.vertical, PazSpacing.md)
                    .background(PazColors.primary).clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .padding(.top, PazSpacing.md)
        }
        .padding(PazSpacing.lg)
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
        .shadow(color: PazColors.pazPrimary.opacity(0.6), radius: 15, x: 0, y: 16)
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

// MARK: - DizimosButtonView

private struct DizimosButtonView: View {
    let label: String
    let primary: Bool
    @State private var pressed = false

    var body: some View {
        Text(label)
            .font(PazTypography.titleMedium)
            .foregroundStyle(primary ? PazColors.pazPrimary : .white)
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(
                Group {
                    if primary {
                        Capsule().fill(.white)
                            .shadow(color: .black.opacity(0.45), radius: 10, x: 0, y: 8)
                    } else {
                        Capsule().fill(.ultraThinMaterial)
                            .overlay(Capsule().strokeBorder(.white.opacity(0.24), lineWidth: 1))
                    }
                }
            )
    }
}

// MARK: - DayPillView

private struct DayPillView: View {
    let dow: String
    let day: Int
    let isSelected: Bool
    let isToday: Bool
    let hasEvent: Bool

    private var dotColor: Color {
        if isToday { return PazColors.pazGold }
        if hasEvent { return PazColors.pazPrimary }
        return .clear
    }

    var body: some View {
        VStack(spacing: 3) {
            Text(dow)
                .font(PazTypography.labelSmall)
                .foregroundStyle(isSelected ? .white.opacity(0.72) : PazColors.slateLight)
            Text("\(day)")
                .font(.system(size: 21, weight: .bold))
                .foregroundStyle(isSelected ? .white : PazColors.ink)
            Circle()
                .fill(dotColor)
                .frame(width: 4, height: 4)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 74)
        .background(
            Group {
                if isSelected {
                    RoundedRectangle(cornerRadius: 18)
                        .fill(PazColors.dayPillSelectedGradient)
                } else if isToday {
                    RoundedRectangle(cornerRadius: 18)
                        .fill(PazColors.surface)
                        .overlay(
                            RoundedRectangle(cornerRadius: 18)
                                .strokeBorder(PazColors.pazPrimary.opacity(0.5), lineWidth: 1.5)
                        )
                } else {
                    RoundedRectangle(cornerRadius: 18)
                        .fill(PazColors.surface)
                        .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(PazColors.line))
                }
            }
        )
        .shadow(
            color: isSelected ? PazColors.pazPrimary.opacity(0.4) : Color.black.opacity(0.06),
            radius: isSelected ? 8 : 4,
            x: 0,
            y: isSelected ? 6 : 2
        )
    }
}

// MARK: - EmptyAgendaView

private struct EmptyAgendaView: View {
    let hasUpcomingEvents: Bool
    let onSeeAll: () -> Void

    var body: some View {
        VStack(spacing: 8) {
            Text(hasUpcomingEvents ? "Nenhum evento para esta semana" : "Nenhum evento agendado")
                .font(PazTypography.titleLarge)
                .foregroundStyle(PazColors.ink)
                .multilineTextAlignment(.center)

            Text(hasUpcomingEvents ? "Confira todos os eventos clicando no botão abaixo." : "Aguarde novos eventos para o futuro.")
                .font(PazTypography.bodyMedium)
                .foregroundStyle(PazColors.slate)
                .multilineTextAlignment(.center)
                .padding(.bottom, hasUpcomingEvents ? 12 : 0)

            if hasUpcomingEvents {
                Button(action: onSeeAll) {
                    Text("Ver próximos eventos")
                        .font(PazTypography.titleMedium)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 48)
                        .background(PazColors.pazPrimaryLight)
                        .clipShape(Capsule())
                }
                .padding(.horizontal, 20)
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(PazColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .strokeBorder(PazColors.line, lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)
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
                    .foregroundStyle(PazColors.pazPrimaryLight)
                    .frame(width: 50, alignment: .leading)

                ZStack {
                    Circle().fill(PazColors.tint).frame(width: 18, height: 18)
                    Circle().fill(PazColors.pazPrimary).frame(width: 10, height: 10)
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
            .background(
                RoundedRectangle(cornerRadius: 18)
                    .fill(PazColors.surface)
                    .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(PazColors.line))
                    .shadow(color: .black.opacity(0.08), radius: 9, x: 0, y: 4)
            )
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
