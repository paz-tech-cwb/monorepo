import Shared
import SwiftUI

/// Short celebration layered on top of the journey screen when a track newly reaches 100%,
/// modeled on `SuccessStateView`'s checkmark + scale/opacity treatment. Auto-dismisses after
/// a couple seconds so it never blocks the member from continuing to use the screen.
struct JourneyLevelUpOverlay: View {
    let track: JourneyTrack
    let onDismiss: () -> Void

    var body: some View {
        ZStack {
            PazColors.primary.opacity(0.45)
                .ignoresSafeArea()

            VStack(spacing: PazSpacing.lg) {
                ZStack {
                    Circle()
                        .fill(PazColors.pazGold.opacity(0.2))
                        .frame(width: 88, height: 88)
                    Image(systemName: "trophy.fill")
                        .font(.system(size: 40, weight: .semibold))
                        .foregroundStyle(PazColors.pazGold)
                }

                Text("Etapa concluída!")
                    .font(PazTypography.headlineSmall)
                    .foregroundStyle(PazColors.ink)
                    .multilineTextAlignment(.center)

                Text("Você completou \"\(track.title)\" na sua jornada.")
                    .font(PazTypography.bodyMedium)
                    .foregroundStyle(PazColors.slate)
                    .multilineTextAlignment(.center)
            }
            .padding(PazSpacing.xl)
            .background(PazColors.background, in: RoundedRectangle(cornerRadius: PazSpacing.cardRadiusCompact, style: .continuous))
            .padding(.horizontal, PazSpacing.xl)
        }
        .transition(.opacity.combined(with: .scale(scale: 0.9)))
        .task(id: track.key) {
            try? await Task.sleep(for: .seconds(2.5))
            onDismiss()
        }
    }
}
