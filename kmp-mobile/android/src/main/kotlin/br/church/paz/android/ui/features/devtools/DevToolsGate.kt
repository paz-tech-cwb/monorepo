package br.church.paz.android.ui.features.devtools

import android.content.Context
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import br.church.paz.shared.domain.model.UserRole
import com.chuckerteam.chucker.api.Chucker

/**
 * Hidden developer-tools trigger attached to the version footer on the Account
 * screen. Ships in every build variant, including release, per product decision.
 *
 * Deliberately uses `pointerInput`/`detectTapGestures` rather than `Modifier.clickable`
 * — `clickable` adds a ripple and announces itself as an interactive control to
 * screen readers, both of which would hint that this inert-looking text is
 * actually tappable. `semantics { role = Role.Button }` keeps it discoverable by
 * assistive tech without the visual ripple.
 *
 * Gating logic (tap count + timing + role check) lives in [DevToolsTapGate], tested
 * separately in isolation since it's the one security-relevant piece of this feature.
 */
fun Modifier.devToolsGate(currentUserRole: UserRole?): Modifier =
    composed {
        val context = LocalContext.current
        val gate = remember { DevToolsTapGate() }

        this
            .pointerInput(currentUserRole) {
                detectTapGestures(
                    onTap = {
                        if (gate.onTap(currentUserRole)) {
                            launchChucker(context)
                        }
                    },
                )
            }.semantics { role = Role.Button }
    }

private fun launchChucker(context: Context) {
    context.startActivity(Chucker.getLaunchIntent(context))
}
