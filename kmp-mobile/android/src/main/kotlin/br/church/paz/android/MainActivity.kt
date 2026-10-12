package br.church.paz.android

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.lifecycleScope
import br.church.paz.android.navigation.PazNavGraph
import br.church.paz.android.notifications.PushNotificationHelper
import br.church.paz.android.ui.theme.AppThemeManager
import br.church.paz.android.ui.theme.PazTheme
import br.church.paz.shared.domain.model.UpdateNotificationPrefsDto
import br.church.paz.shared.domain.repository.UserRepository
import kotlinx.coroutines.launch
import org.koin.android.ext.android.inject

class MainActivity : ComponentActivity() {
    private val userRepository: UserRepository by inject()
    private val themeManager: AppThemeManager by inject()

    /**
     * Route requested by a tapped push notification, waiting for the nav graph to be ready.
     * Compose state so a tap delivered via [onNewIntent] (app already running, `singleTop`)
     * reaches the already-composed [PazNavGraph]; it is cleared via `onDeepLinkConsumed`.
     */
    private var pendingDeepLinkRoute by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        PushNotificationHelper.requestPermissionIfNeeded(this, lifecycleScope, userRepository)

        // On process-death/config-change recreation the original launch Intent is re-delivered;
        // only a genuine fresh launch should consume the notification extras.
        if (savedInstanceState == null) {
            pendingDeepLinkRoute = consumeDeepLinkRoute(intent)
        }

        setContent {
            val isDarkMode by themeManager.isDarkMode.collectAsStateWithLifecycle()
            PazTheme(darkTheme = isDarkMode) {
                PazNavGraph(
                    pendingDeepLinkRoute = pendingDeepLinkRoute,
                    onDeepLinkConsumed = { pendingDeepLinkRoute = null },
                )
            }
        }
    }

    // App already running (background or foreground) and a notification was tapped:
    // MainActivity is `singleTop`, so the system delivers the tap here instead of onCreate.
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        consumeDeepLinkRoute(intent)?.let { pendingDeepLinkRoute = it }
    }

    /** Reads (and strips, so it never re-fires) the deep link extra of a notification tap. */
    private fun consumeDeepLinkRoute(source: Intent): String? {
        val route = PushNotificationHelper.routeFromExtras { source.getStringExtra(it) }
        source.removeExtra(PushNotificationHelper.KEY_DEEP_LINK)
        source.removeExtra("deepLink")
        return route
    }

    override fun onResume() {
        super.onResume()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val status =
                if (ContextCompat.checkSelfPermission(
                        this,
                        Manifest.permission.POST_NOTIFICATIONS,
                    ) == PackageManager.PERMISSION_GRANTED
                ) {
                    "granted"
                } else {
                    "denied"
                }
            lifecycleScope.launch {
                runCatching {
                    userRepository.updateNotificationPreferences(
                        UpdateNotificationPrefsDto(osPermissionStatus = status),
                    )
                }
            }
        }
    }
}
