import PulseUI
import Shared
import SwiftUI

/// Hidden developer-tools trigger attached to the version footer on the Account screen.
///
/// Ships in every build configuration, including production/release — not just Debug —
/// per product decision. See the implementation below for the exact gesture mechanics
/// (deliberately not documented here or anywhere else in the repo). Gating also requires
/// the signed-in user's backend-sourced role to be `admin` or `pastor` — a regular member
/// can never open this, even if the gesture itself became publicly known, since the role
/// check is enforced locally against data the backend issued, not a local flag.
///
/// Both checks failing is intentionally silent: no alert, no haptic, no visual
/// feedback distinguishable from a normal tap on inert text. This avoids revealing to
/// an unprivileged user that a hidden feature exists at all.
struct DevToolsGate: ViewModifier {
    let currentUserRole: UserRole?

    @State private var tapTimestamps: [Date] = []
    @State private var isPresented = false

    private let requiredTapCount = 7
    private let tapWindow: TimeInterval = 3

    func body(content: Content) -> some View {
        content
            .contentShape(Rectangle())
            .onTapGesture { registerTap() }
            .accessibilityAddTraits(.isButton)
            .sheet(isPresented: $isPresented) {
                ConsoleView()
            }
    }

    private func registerTap() {
        let now = Date()
        tapTimestamps = tapTimestamps.filter { now.timeIntervalSince($0) <= tapWindow } + [now]

        guard tapTimestamps.count >= requiredTapCount else { return }
        tapTimestamps.removeAll()

        guard currentUserRole == .admin || currentUserRole == .pastor else { return }

        isPresented = true
    }
}

extension View {
    /// Attaches the hidden dev-tools trigger. See [DevToolsGate].
    func devToolsGate(currentUserRole: UserRole?) -> some View {
        modifier(DevToolsGate(currentUserRole: currentUserRole))
    }
}
