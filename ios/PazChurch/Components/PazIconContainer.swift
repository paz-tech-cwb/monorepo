import SwiftUI

struct PazIconContainer: View {
    let icon: String
    let tint: Color
    var size: CGFloat = 38

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12)
                .fill(tint.opacity(0.14))
                .frame(width: size, height: size)
            Image(systemName: icon)
                .font(.system(size: size * 0.5, weight: .medium))
                .foregroundStyle(tint)
        }
    }
}

#Preview {
    HStack(spacing: 12) {
        PazIconContainer(icon: "figure.walk", tint: .blue)
        PazIconContainer(icon: "bell", tint: .orange)
        PazIconContainer(icon: "door.left.hand.open", tint: .red)
    }
    .padding()
}
