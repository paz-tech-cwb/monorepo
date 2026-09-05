import SwiftUI

struct PazGoldBadge: View {
    let text: String

    var body: some View {
        Text(text)
            .font(PazTypography.labelSmall)
            .fontWeight(.bold)
            .foregroundStyle(Color(hex: "3A2600"))
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(PazColors.pazGold)
            .clipShape(Capsule())
    }
}

#Preview {
    PazGoldBadge(text: "DOMINGO · 10H").padding()
}
