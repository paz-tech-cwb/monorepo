import SwiftUI

struct PazPillChip: View {
    let label: String
    let selected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            Text(label)
                .font(PazTypography.labelMedium)
                .fontWeight(.semibold)
                .foregroundStyle(selected ? .white : PazColors.ink)
                .padding(.horizontal, 16)
                .frame(height: 38)
                .background(selected ? PazColors.pazPrimary : PazColors.surface)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(PazColors.pazPrimary.opacity(selected ? 0 : 0.18), lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    HStack {
        PazPillChip(label: "Geral", selected: true, onTap: {})
        PazPillChip(label: "Estudo", selected: false, onTap: {})
    }
    .padding()
}
