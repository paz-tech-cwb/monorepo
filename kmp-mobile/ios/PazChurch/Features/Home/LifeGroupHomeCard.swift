import Shared
import SwiftUI

/// "Quinta-feira às 20:00": the meeting day/time line shared by the life group detail and the
/// home card. Missing/empty parts are omitted; nil when both are empty. Mirrors Android's
/// `lifeGroupMeetingLabel`.
func lifeGroupMeetingLabel(day: String?, time: String?) -> String? {
    let day = day.flatMap { $0.isEmpty ? nil : $0 }
    let time = time.flatMap { $0.isEmpty ? nil : $0 }
    switch (day, time) {
    case let (day?, time?): return "\(day) às \(time)"
    case let (day?, nil): return day
    case let (nil, time?): return time
    case (nil, nil): return nil
    }
}

/// The viewer's life groups as ONE glass card ("Meus grupos"): with several groups a "MEUS GRUPOS" header and one
/// row per group separated by dividers; with a single group the same card keeps its "LIFE GROUP" kicker
/// (unchanged look). Layout decisions come from the shared `homeLifeGroupsLayout`. Each row's header opens that
/// group's detail and the viewer's upcoming tasks ("Minhas tarefas") are folded in below it; the header and each
/// task row are SIBLING NavigationLinks, never nested.
struct LifeGroupsHomeSection: View {
    let cards: [HomeLifeGroupCard]
    let taskRepository: LifeGroupTaskRepository

    var body: some View {
        let layout = HomeLifeGroupCardKt.homeLifeGroupsLayout(groupCount: Int32(cards.count))
        VStack(alignment: .leading, spacing: PazSpacing.sm) {
            if layout.showsSectionHeader {
                Text(HomeLifeGroupsSection.shared.HEADER_SEVERAL)
                    .font(PazTypography.labelMedium)
                    .foregroundStyle(PazColors.accent.opacity(0.7))
            }
            ForEach(Array(cards.enumerated()), id: \.element.group.id) { index, card in
                if index > 0 {
                    Divider().padding(.vertical, PazSpacing.xs)
                }
                LifeGroupHomeRow(card: card, showsKicker: layout.showsRowKicker, taskRepository: taskRepository)
            }
        }
        .padding(PazSpacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassCard(radius: PazSpacing.cardRadiusCompact)
    }
}

/// One group inside `LifeGroupsHomeSection`: header (tap -> group detail) plus its folded-in tasks.
struct LifeGroupHomeRow: View {
    let card: HomeLifeGroupCard
    let showsKicker: Bool
    let taskRepository: LifeGroupTaskRepository

    var body: some View {
        let group = card.group
        VStack(alignment: .leading, spacing: PazSpacing.sm) {
            NavigationLink {
                LifeGroupDetailView(lifeGroup: group)
            } label: {
                HStack(spacing: PazSpacing.md) {
                    VStack(alignment: .leading, spacing: PazSpacing.xs) {
                        if showsKicker {
                            Text(HomeLifeGroupsSection.shared.KICKER_SINGLE)
                                .font(PazTypography.labelMedium)
                                .foregroundStyle(PazColors.accent.opacity(0.7))
                        }
                        Text(group.name)
                            .font(PazTypography.titleMedium)
                            .foregroundStyle(PazColors.ink)
                        if let leader = group.leader {
                            Text("Líder: \(leader)")
                                .font(PazTypography.bodySmall)
                                .foregroundStyle(PazColors.slate)
                        }
                        if let meeting = lifeGroupMeetingLabel(day: group.meetingDay, time: group.meetingTime) {
                            Text(meeting)
                                .font(PazTypography.bodySmall)
                                .foregroundStyle(PazColors.slate)
                        }
                        Text("\(group.membersCount) membros")
                            .font(PazTypography.bodySmall)
                            .foregroundStyle(PazColors.slate)
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14))
                        .foregroundColor(.gray)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            if !card.tasks.isEmpty {
                Divider()
                HStack(spacing: PazSpacing.md) {
                    Image(systemName: "list.bullet.clipboard.fill")
                        .font(.system(size: 18))
                        .foregroundColor(PazColors.accent)
                    Text("Minhas tarefas")
                        .font(PazTypography.titleSmall)
                        .foregroundColor(PazColors.ink)
                }
                LifeGroupTaskRows(tasks: card.tasks, repository: taskRepository)
            }
        }
    }
}
