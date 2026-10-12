package br.church.paz.android.notifications

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import br.church.paz.shared.domain.model.DevicePlatform
import br.church.paz.shared.domain.model.DeviceToken
import br.church.paz.shared.domain.repository.UserRepository
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

object PushNotificationHelper {
    // Call once after login to register the current FCM token with the backend.
    suspend fun registerToken(userRepository: UserRepository) {
        try {
            val token = FirebaseMessaging.getInstance().token.await()
            userRepository.registerDeviceToken(
                DeviceToken(token = token, platform = DevicePlatform.android),
            )
        } catch (_: Exception) {
            // Non-critical — token registration is best-effort.
            // FCM will retry via onNewToken when the token refreshes.
        }
    }

    // Call from MainActivity.onCreate to request POST_NOTIFICATIONS permission on Android 13+.
    fun requestPermissionIfNeeded(
        activity: ComponentActivity,
        scope: CoroutineScope,
        userRepository: UserRepository,
    ) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            scope.launch { registerToken(userRepository) }
            return
        }

        val permission = Manifest.permission.POST_NOTIFICATIONS
        if (ContextCompat.checkSelfPermission(activity, permission) == PackageManager.PERMISSION_GRANTED) {
            scope.launch { registerToken(userRepository) }
            return
        }

        val launcher =
            activity.registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
                if (granted) {
                    scope.launch { registerToken(userRepository) }
                }
            }
        launcher.launch(permission)
    }

    /** Key of the deep link in the FCM `data` payload (and thus in the launcher Intent extras). */
    const val KEY_DEEP_LINK = "deep_link"

    /** Legacy/alternate spelling accepted defensively when reading extras. */
    private const val KEY_DEEP_LINK_CAMEL = "deepLink"

    /**
     * Resolves a navigation route from the extras of the Intent that opened the app.
     *
     * Two producers feed this: (1) our own [PazFirebaseMessagingService] notification
     * (extra [KEY_DEEP_LINK]), shown while the app is in the foreground, and (2) the system-tray
     * notification the FCM SDK renders itself when the app is in the background/killed — it
     * launches the launcher activity with every `data` key as an Intent extra, never going
     * through [PazFirebaseMessagingService]. [readExtra] abstracts `Intent.getStringExtra`
     * so this stays a pure, JVM-testable function.
     */
    fun routeFromExtras(readExtra: (String) -> String?): String? {
        val deepLink = readExtra(KEY_DEEP_LINK) ?: readExtra(KEY_DEEP_LINK_CAMEL)
        return deepLink?.takeIf { it.isNotBlank() }?.let { parseDeepLink(it) }
    }

    // Parse a deep link string from a notification tap into a navigation route.
    fun parseDeepLink(rawDeepLink: String): String? {
        val deepLink = rawDeepLink.trim()
        return when {
            deepLink.startsWith("paz://agenda/") -> singleIdRoute(deepLink, "paz://agenda/", "agenda_detail")
            deepLink.startsWith("paz://form/") -> singleIdRoute(deepLink, "paz://form/", "form_detail")
            deepLink.startsWith("paz://ministry/") -> singleIdRoute(deepLink, "paz://ministry/", "ministry_detail")
            deepLink.startsWith("paz://lifegroup/") -> singleIdRoute(deepLink, "paz://lifegroup/", "life_group_detail")
            deepLink.startsWith("paz://estudo-do-life/") ->
                singleIdRoute(deepLink, "paz://estudo-do-life/", "life_group_study_detail")
            deepLink.startsWith("paz://presenca/") -> {
                val parts = deepLink.removePrefix("paz://presenca/").trimEnd('/').split("/", limit = 2)
                val lifeGroupId = parts.getOrNull(0)
                val meetingDate = parts.getOrNull(1)
                if (lifeGroupId.isNullOrBlank() || meetingDate.isNullOrBlank()) {
                    null
                } else {
                    "life_group_attendance_editor/$lifeGroupId/$meetingDate"
                }
            }
            deepLink.startsWith("paz://tarefa/") -> {
                val assignmentId = deepLink.removePrefix("paz://tarefa/").trim('/')
                if (assignmentId.isBlank() || assignmentId.contains('/')) null else "life_group_task/$assignmentId"
            }
            deepLink.startsWith("paz://formularios") -> "formularios"
            deepLink.startsWith("paz://journey") -> "member_journey"
            deepLink.startsWith("paz://account") -> "account"
            else -> null
        }
    }

    /**
     * `prefix{id}` -> `route/{id}`. A blank id or extra path segments yield null: navigating to
     * an unmatched route (e.g. `agenda_detail/`) throws IllegalArgumentException in Navigation.
     */
    private fun singleIdRoute(
        deepLink: String,
        prefix: String,
        route: String,
    ): String? {
        val id = deepLink.removePrefix(prefix).trim('/')
        return if (id.isBlank() || id.contains('/')) null else "$route/$id"
    }
}
