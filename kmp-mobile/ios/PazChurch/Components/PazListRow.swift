import SwiftUI

/// Shared list-row building blocks used by menu/hub screens (Account, Reports, …).
/// Extracted out of `AccountView` so other screens (e.g. `ReportsListView`) can reuse the
/// exact same look instead of duplicating it.

struct PazListRow: View {
    let title: String
    let icon: String
    let tint: Color

    var body: some View {
        HStack(spacing: 16) {
            PazIconContainer(icon: icon, tint: tint)
            Text(title).font(PazTypography.bodyMedium).foregroundStyle(PazColors.ink)
            Spacer()
            Image(systemName: "chevron.right").font(.system(size: 13)).foregroundStyle(PazColors.slateLight)
        }
        .padding(.horizontal, 16).padding(.vertical, 12)
    }
}

func pazMenuCard(@ViewBuilder content: () -> some View) -> some View {
    GlassCard(radius: PazSpacing.cardRadiusCompact) {
        VStack(spacing: 0) { content() }
    }
}

var pazRowDivider: some View {
    Divider().padding(.leading, 20)
}
