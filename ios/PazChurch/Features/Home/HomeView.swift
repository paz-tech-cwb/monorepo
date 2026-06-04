import SwiftUI
import Shared

// MARK: - Scroll offset preference key
private struct ScrollOffsetKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = nextValue() }
}

// MARK: - HomeView
struct HomeView: View {
    @StateObject private var viewModel: HomeViewModel
    @State private var scrollOffset: CGFloat = 0
    @State private var selectedDayIndex: Int = 2     // Wednesday
    @State private var currentFeatureIndex: Int = 0
    @Environment(\.colorScheme) private var colorScheme

    init(homeRepository: HomeRepository, authRepository: AuthRepository) {
        _viewModel = StateObject(wrappedValue: HomeViewModel(
            homeRepository: homeRepository,
            authRepository: authRepository
        ))
    }

    private var isCollapsed: Bool { scrollOffset > 64 }
    private var isDark: Bool { colorScheme == .dark }

    private var banners: [Banner] { viewModel.homeContent?.banners ?? [] }
    private var bank: BankInfo? { viewModel.homeContent?.contribution?.bank }
    private var agendaEvents: [AgendaEvent] { Array((viewModel.homeContent?.agenda ?? []).prefix(3)) }

    var body: some View {
        ZStack(alignment: .top) {
            mainScroll
            compactNavOverlay
        }
        .ignoresSafeArea(edges: .top)
    }

    // MARK: - Main scroll

    private var mainScroll: some View {
        ScrollView {
            VStack(spacing: 0) {
                GeometryReader { geo in
                    Color.clear.preference(
                        key: ScrollOffsetKey.self,
                        value: -geo.frame(in: .named("homeScroll")).minY
                    )
                }
                .frame(height: 0)

                largeHeader

                if viewModel.isLoading {
                    loadingState
                } else if viewModel.error != nil {
                    errorState
                } else {
                    contentSections
                }

                Spacer().frame(height: 40)
            }
        }
        .coordinateSpace(name: "homeScroll")
        .onPreferenceChange(ScrollOffsetKey.self) { scrollOffset = $0 }
        .background(PazColors.background)
        .task { await viewModel.load() }
    }

    // MARK: - Content sections

    @ViewBuilder
    private var contentSections: some View {
        if !banners.isEmpty {
            featuredSection
                .padding(.top, 26)
                .transition(.opacity.combined(with: .move(edge: .bottom)))
                .animation(.spring(response: 0.6, dampingFraction: 0.8), value: banners.count)
        }
        if let b = bank {
            dizimosCard(bank: b)
                .padding(.top, 26)
                .transition(.opacity.combined(with: .move(edge: .bottom)))
                .animation(.spring(response: 0.6, dampingFraction: 0.8).delay(0.065), value: banners.count)
        }
        if !agendaEvents.isEmpty {
            agendaSection
                .padding(.top, 26)
                .transition(.opacity.combined(with: .move(edge: .bottom)))
                .animation(.spring(response: 0.6, dampingFraction: 0.8).delay(0.13), value: agendaEvents.count)
        }
    }

    // MARK: - Compact nav overlay

    private var compactNavOverlay: some View {
        HStack {
            if isCollapsed {
                Spacer()
                Text("Início")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(PazColors.ink)
                Spacer()
            } else {
                Spacer()
            }
            bellButton
                .opacity(isCollapsed ? 1 : 0)
        }
        .padding(.horizontal, 16)
        .frame(height: 46)
        .background(
            Group {
                if isCollapsed {
                    Rectangle()
                        .fill(.ultraThinMaterial)
                        .overlay(
                            Rectangle().fill(PazColors.line).frame(height: 0.5),
                            alignment: .bottom
                        )
                } else {
                    Color.clear
                }
            }
        )
        .padding(.top, safeAreaTop)
        .animation(.easeInOut(duration: 0.2), value: isCollapsed)
    }

    private var bellButton: some View {
        Button(action: {}) {
            ZStack(alignment: .topTrailing) {
                Image(systemName: "bell")
                    .font(.system(size: 20, weight: .regular))
                    .foregroundColor(PazColors.ink)
                Circle()
                    .fill(PazColors.pazGold)
                    .frame(width: 8, height: 8)
                    .offset(x: 2, y: -2)
            }
            .frame(width: 23, height: 23)
        }
    }

    // MARK: - Large header

    private var largeHeader: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 0) {
                Text("QUARTA, 4 DE JUNHO")
                    .font(PazTypography.labelSmall)
                    .foregroundColor(PazColors.pazPrimaryLight)
                    .padding(.bottom, 7)
                Text("Olá, \(viewModel.userName.isEmpty ? "Lucas" : viewModel.userName)")
                    .font(.custom("PlayfairDisplay-ExtraBold", size: 34))
                    .foregroundColor(isDark ? PazColors.ink : PazColors.pazPrimary)
                    .lineSpacing(2)
            }
            Spacer()
            bellButton
                .opacity(isCollapsed ? 0 : 1)
                .animation(.easeInOut(duration: 0.2), value: isCollapsed)
        }
        .padding(.horizontal, 18)
        .padding(.top, safeAreaTop + 52 + 6)
        .padding(.bottom, 2)
    }

    // MARK: - Featured section

    private var featuredSection: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Eventos")
                    .font(.custom("PlayfairDisplay-ExtraBold", size: 23))
                    .foregroundColor(PazColors.ink)
                Spacer()
                Button(action: {}) {
                    HStack(spacing: 5) {
                        Text("Ver todos").font(PazTypography.labelSmall)
                        Image(systemName: "arrow.right").font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundColor(PazColors.pazPrimaryLight)
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 13)

            TabView(selection: $currentFeatureIndex) {
                ForEach(Array(banners.enumerated()), id: \.offset) { index, banner in
                    FeaturedCardView(
                        badge:    banner.actionUrl ?? "",
                        title:    banner.title,
                        subtitle: banner.imageUrl,
                        isAlt:    index % 2 == 1
                    )
                    .padding(.horizontal, 18)
                    .tag(index)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .frame(height: 176)

            HStack(spacing: 6) {
                ForEach(0..<banners.count, id: \.self) { i in
                    Capsule()
                        .fill(i == currentFeatureIndex
                              ? (isDark ? PazColors.pazPrimaryLight : PazColors.pazPrimary)
                              : Color(white: 0, opacity: 0.16))
                        .frame(width: i == currentFeatureIndex ? 20 : 7, height: 7)
                        .animation(.easeInOut(duration: 0.25), value: currentFeatureIndex)
                }
            }
            .padding(.top, 13)
        }
    }

    // MARK: - Dízimos card

    private func dizimosCard(bank: BankInfo) -> some View {
        ZStack(alignment: .topLeading) {
            RadialGradient(
                colors: [Color(hex: "1257A0"), Color(hex: "0B4D8C"), Color(hex: "07315E")],
                center: UnitPoint(x: 0.82, y: -0.08),
                startRadius: 0,
                endRadius: 400
            )

            VStack(alignment: .leading, spacing: 0) {
                Text("DÍZIMOS & OFERTAS")
                    .font(PazTypography.labelSmall)
                    .foregroundColor(.white.opacity(0.6))

                Text("Contribua com a visão")
                    .font(.custom("PlayfairDisplay-ExtraBold", size: 27))
                    .foregroundColor(.white)
                    .padding(.top, 9)

                Text("Sua oferta transforma vidas na comunidade")
                    .font(PazTypography.bodyMedium)
                    .foregroundColor(.white.opacity(0.7))
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
        .shadow(color: Color(hex: "07315E").opacity(0.65), radius: 21, x: 0, y: 22)
        .padding(.horizontal, 16)
    }

    // MARK: - Agenda section

    private var agendaSection: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Agenda")
                    .font(.custom("PlayfairDisplay-ExtraBold", size: 23))
                    .foregroundColor(PazColors.ink)
                Spacer()
                Button(action: {}) {
                    HStack(spacing: 5) {
                        Text("Mês completo").font(PazTypography.labelSmall)
                        Image(systemName: "arrow.right").font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundColor(PazColors.pazPrimaryLight)
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 13)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 9) {
                    ForEach(Array(agendaDayItems.enumerated()), id: \.offset) { index, item in
                        DayPillView(dow: item.dow, day: item.day, isSelected: index == selectedDayIndex)
                            .onTapGesture {
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                    selectedDayIndex = index
                                }
                            }
                    }
                }
                .padding(.horizontal, 18)
                .padding(.vertical, 4)
            }
            .padding(.bottom, 6)

            VStack(spacing: 12) {
                ForEach(agendaEvents, id: \.id) { event in
                    EventCardView(event: event, onTap: {})
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 4)
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
                .foregroundColor(PazColors.error)
            Text("Erro ao carregar").font(PazTypography.titleMedium)
            Text(viewModel.error ?? "Algo deu errado")
                .font(PazTypography.bodySmall).foregroundColor(.gray)
            Button(action: { viewModel.onRetry() }) {
                Text("Tentar Novamente")
                    .font(PazTypography.titleMedium).foregroundColor(.white)
                    .frame(maxWidth: .infinity).padding(.vertical, PazSpacing.md)
                    .background(PazColors.primary).cornerRadius(12)
            }
            .padding(.top, PazSpacing.md)
        }
        .padding(PazSpacing.lg)
    }

    // MARK: - Safe area helper

    private var safeAreaTop: CGFloat {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first?.windows.first?.safeAreaInsets.top ?? 47
    }
}

// MARK: - Agenda mock data
private struct AgendaDayItem { let dow: String; let day: Int }
private let agendaDayItems: [AgendaDayItem] = [
    .init(dow: "SEG", day: 2), .init(dow: "TER", day: 3), .init(dow: "QUA", day: 4),
    .init(dow: "QUI", day: 5), .init(dow: "SEX", day: 6), .init(dow: "SÁB", day: 7),
    .init(dow: "DOM", day: 8),
]

// MARK: - FeaturedCardView

private struct FeaturedCardView: View {
    let badge: String
    let title: String
    let subtitle: String
    let isAlt: Bool

    @State private var pressed = false

    private var gradient: LinearGradient {
        isAlt
            ? LinearGradient(
                colors: [Color(hex: "0E4683"), Color(hex: "0B3A6B"), Color(hex: "072E58")],
                startPoint: .topLeading, endPoint: .bottomTrailing)
            : LinearGradient(
                colors: [Color(hex: "0A335F"), Color(hex: "072E5A"), Color(hex: "06243F")],
                startPoint: .topLeading, endPoint: .bottomTrailing)
    }

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            gradient

            CrossWatermarkView()
                .frame(width: 158, height: 158)
                .opacity(0.08)
                .rotationEffect(.degrees(-9))
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                .offset(x: 14, y: 30)
                .clipped()

            VStack(alignment: .leading, spacing: 0) {
                Text(badge)
                    .font(PazTypography.labelSmall)
                    .foregroundColor(Color(hex: "3A2600"))
                    .padding(.horizontal, 13).padding(.vertical, 6)
                    .background(Color(hex: "FFB300"))
                    .clipShape(Capsule())

                Spacer()

                Text(title)
                    .font(.custom("PlayfairDisplay-ExtraBold", size: 23))
                    .foregroundColor(.white)
                    .lineLimit(2)

                Text(subtitle)
                    .font(PazTypography.bodySmall)
                    .foregroundColor(.white.opacity(0.72))
                    .padding(.top, 5)
            }
            .padding(18)
        }
        .frame(height: 176)
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .shadow(color: Color(hex: "07295E").opacity(0.6), radius: 15, x: 0, y: 16)
        .scaleEffect(pressed ? 0.97 : 1.0)
        .animation(.easeInOut(duration: 0.12), value: pressed)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in pressed = true }
                .onEnded   { _ in pressed = false }
        )
    }
}

// MARK: - CrossWatermarkView

private struct CrossWatermarkView: View {
    var body: some View {
        Canvas { ctx, size in
            let sx = size.width  / 24
            let sy = size.height / 24
            var p = Path()
            p.move(to:    .init(x: 10.6 * sx, y:  2.5 * sy))
            p.addLine(to: .init(x: 13.4 * sx, y:  2.5 * sy))
            p.addLine(to: .init(x: 13.4 * sx, y:  6.7 * sy))
            p.addLine(to: .init(x: 18   * sx, y:  6.7 * sy))
            p.addLine(to: .init(x: 18   * sx, y:  9.5 * sy))
            p.addLine(to: .init(x: 13.4 * sx, y:  9.5 * sy))
            p.addLine(to: .init(x: 13.4 * sx, y: 21.5 * sy))
            p.addLine(to: .init(x: 10.6 * sx, y: 21.5 * sy))
            p.addLine(to: .init(x: 10.6 * sx, y:  9.5 * sy))
            p.addLine(to: .init(x:  6   * sx, y:  9.5 * sy))
            p.addLine(to: .init(x:  6   * sx, y:  6.7 * sy))
            p.addLine(to: .init(x: 10.6 * sx, y:  6.7 * sy))
            p.closeSubpath()
            ctx.fill(p, with: .color(.white))
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
            .foregroundColor(primary ? Color(hex: "0B3A6B") : .white)
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
            .scaleEffect(pressed ? 0.97 : 1.0)
            .animation(.easeInOut(duration: 0.12), value: pressed)
            .simultaneousGesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in pressed = true }
                    .onEnded   { _ in pressed = false }
            )
    }
}

// MARK: - DayPillView

private struct DayPillView: View {
    let dow: String
    let day: Int
    let isSelected: Bool

    var body: some View {
        VStack(spacing: 3) {
            Text(dow)
                .font(PazTypography.labelSmall)
                .foregroundColor(isSelected ? .white.opacity(0.72) : PazColors.slateLight)
            Text("\(day)")
                .font(.system(size: 21, weight: .bold))
                .foregroundColor(isSelected ? .white : PazColors.ink)
            Circle()
                .fill(isSelected ? PazColors.pazGold : .clear)
                .frame(width: 4, height: 4)
        }
        .frame(width: 52, height: 74)
        .background(
            Group {
                if isSelected {
                    RoundedRectangle(cornerRadius: 18)
                        .fill(LinearGradient(
                            colors: [Color(hex: "0A3360"), Color(hex: "06294C")],
                            startPoint: .top, endPoint: .bottom
                        ))
                        .shadow(color: Color(hex: "07295E").opacity(0.6), radius: 11, x: 0, y: 12)
                } else {
                    RoundedRectangle(cornerRadius: 18)
                        .fill(PazColors.surface)
                        .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(PazColors.line))
                        .shadow(color: .black.opacity(0.05), radius: 3, x: 0, y: 2)
                }
            }
        )
    }
}

// MARK: - EventCardView

private struct EventCardView: View {
    let event: AgendaEvent
    let onTap: () -> Void

    private var time: String {
        guard let part = event.startDate.split(separator: "T").last else { return "--:--" }
        return String(part.prefix(5))
    }

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 13) {
                Text(time)
                    .font(.system(size: 15.5, weight: .bold))
                    .foregroundColor(PazColors.pazPrimaryLight)
                    .frame(width: 50, alignment: .leading)

                ZStack {
                    Circle().fill(PazColors.tint).frame(width: 18, height: 18)
                    Circle().fill(PazColors.pazPrimary).frame(width: 10, height: 10)
                }

                VStack(alignment: .leading, spacing: 3) {
                    Text(event.title)
                        .font(.system(size: 15.5, weight: .bold))
                        .foregroundColor(PazColors.ink)
                        .lineLimit(1)

                    if let loc = event.location, !loc.isEmpty {
                        HStack(spacing: 5) {
                            Image(systemName: "mappin.fill")
                                .font(.system(size: 10))
                                .foregroundColor(Color(hex: "E0533D"))
                            Text(loc)
                                .font(PazTypography.bodySmall)
                                .foregroundColor(PazColors.slate)
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
                    endPoint:   animating ? .trailing : .leading
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
