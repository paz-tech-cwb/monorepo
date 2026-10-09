package br.church.paz.android.ui.features.devtools

import br.church.paz.shared.domain.model.UserRole

/**
 * Pure tap-counting + role-gating logic behind the hidden developer-tools trigger
 * (see the version footer on the Account screen). Kept free of any Compose/Android
 * framework dependency so it can be unit-tested in isolation — this is the one piece
 * of logic in this feature where a bug has real security consequences (a regular
 * member must never be able to open this, even by accident).
 *
 * The exact tap count / time window are intentionally not documented beyond this
 * file — see `DevToolsGate` composable for where this is wired up.
 */
class DevToolsTapGate(
    private val requiredTapCount: Int = REQUIRED_TAP_COUNT,
    private val tapWindowMillis: Long = TAP_WINDOW_MILLIS,
    private val now: () -> Long = { System.currentTimeMillis() },
) {
    private val tapTimestamps = mutableListOf<Long>()

    /**
     * Registers a single tap. Returns `true` only when this tap is the one that
     * completes [requiredTapCount] taps within [tapWindowMillis] of each other AND
     * [role] is privileged enough to open the gate. Any other outcome (not enough
     * taps yet, taps spread out past the window, or an unprivileged role) returns
     * `false` with no other observable side effect — callers must not surface any
     * feedback distinguishable between "not enough taps" and "wrong role", so an
     * unprivileged user can't tell a hidden feature exists at all.
     */
    fun onTap(role: UserRole?): Boolean {
        val timestamp = now()
        tapTimestamps.removeAll { timestamp - it > tapWindowMillis }
        tapTimestamps.add(timestamp)

        if (tapTimestamps.size < requiredTapCount) return false
        tapTimestamps.clear()

        return role == UserRole.admin || role == UserRole.pastor
    }

    companion object {
        private const val REQUIRED_TAP_COUNT = 7
        private const val TAP_WINDOW_MILLIS = 3_000L
    }
}
