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

/// One card per life group on the home screen: the header (name, leader, meeting, members) opens
/// the group detail; the viewer's upcoming tasks for this group ("Minhas tarefas") are folded in
/// below it. The header and each task row are SIBLING NavigationLinks, never nested.
struct LifeGroupHomeCard: View {
    let card: HomeLifeGroupCard
    let taskRepository: LifeGroupTaskRepository

    var body: some View {
        let group = card.group
        VStack(alignment: .leading, spacing: PazSpacing.sm) {
            NavigationLink {
                LifeGroupDetailView(lifeGroup: group)
            } label: {
                HStack(spacing: PazSpacing.md) {
                    VStack(alignment: .leading, spacing: PazSpacing.xs) {
                        Text("LIFE GROUP")
                            .font(PazTypography.labelMedium)
                            .foregroundStyle(PazColors.accent.opacity(0.7))
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
        .padding(PazSpacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassCard(radius: PazSpacing.cardRadiusCompact)
    }
}
