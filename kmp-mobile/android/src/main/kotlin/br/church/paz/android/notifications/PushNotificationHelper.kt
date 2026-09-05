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

    // Parse a deep link string from a notification tap into a navigation route.
    fun parseDeepLink(deepLink: String): String? =
        when {
            deepLink.startsWith("paz://agenda/") -> "agenda_detail/${deepLink.removePrefix("paz://agenda/")}"
            deepLink.startsWith("paz://form/") -> "form_detail/${deepLink.removePrefix("paz://form/")}"
            deepLink.startsWith("paz://ministry/") -> "ministry_detail/${deepLink.removePrefix("paz://ministry/")}"
            deepLink.startsWith("paz://lifegroup/") -> "life_group_detail/${deepLink.removePrefix("paz://lifegroup/")}"
            deepLink.startsWith("paz://estudo-do-life/") ->
                "life_group_study_detail/${deepLink.removePrefix("paz://estudo-do-life/")}"
            deepLink.startsWith("paz://formularios") -> "formularios"
            deepLink.startsWith("paz://journey") -> "member_journey"
            deepLink.startsWith("paz://account") -> "account"
            else -> null
        }
}
