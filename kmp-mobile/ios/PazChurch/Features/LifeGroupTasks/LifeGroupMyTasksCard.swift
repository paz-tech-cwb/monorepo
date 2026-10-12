import Shared
import SwiftUI

/// "Minhas tarefas": the signed-in member's upcoming assigned tasks for one life group.
/// Hidden by the caller when empty. Each row opens the task guide.
struct LifeGroupMyTasksCard: View {
    let tasks: [LifeGroupTask]
    let repository: LifeGroupTaskRepository

    var body: some View {
        VStack(alignment: .leading, spacing: PazSpacing.sm) {
            HStack(spacing: PazSpacing.md) {
                Image(systemName: "list.bullet.clipboard.fill")
                    .font(.system(size: 18))
                    .foregroundColor(PazColors.accent)
                Text("Minhas tarefas")
                    .font(PazTypography.titleSmall)
                    .foregroundColor(PazColors.ink)
            }
            ForEach(tasks, id: \.id) { task in
                NavigationLink {
                    LifeGroupTaskGuideView(assignmentId: task.id, repository: repository)
                } label: {
                    HStack(spacing: PazSpacing.md) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(task.name)
                                .font(PazTypography.bodyMedium)
                                .foregroundColor(PazColors.ink)
                            Text(brDateString(fromISODate: task.meetingDate))
                                .font(PazTypography.labelMedium)
                                .foregroundColor(PazColors.slate)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 14))
                            .foregroundColor(.gray)
                    }
                    .padding(.vertical, PazSpacing.sm)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(PazSpacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassCard(radius: PazSpacing.cardRadiusCompact)
    }
}
