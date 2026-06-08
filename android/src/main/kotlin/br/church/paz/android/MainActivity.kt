package br.church.paz.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.lifecycleScope
import br.church.paz.android.navigation.PazNavGraph
import br.church.paz.android.notifications.PazFirebaseMessagingService
import br.church.paz.android.notifications.PushNotificationHelper
import br.church.paz.android.ui.theme.AppThemeManager
import br.church.paz.android.ui.theme.PazTheme
import br.church.paz.shared.domain.repository.UserRepository
import org.koin.android.ext.android.inject

class MainActivity : ComponentActivity() {
    private val userRepository: UserRepository by inject()
    private val themeManager: AppThemeManager by inject()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Request POST_NOTIFICATIONS permission (Android 13+) and register FCM token.
        PushNotificationHelper.requestPermissionIfNeeded(this, lifecycleScope, userRepository)

        // Resolve any deep link carried by a notification tap.
        val startRoute =
            intent
                .getStringExtra(PazFirebaseMessagingService.EXTRA_DEEP_LINK)
                ?.let { PushNotificationHelper.parseDeepLink(it) }

        setContent {
            val isDarkMode by themeManager.isDarkMode.collectAsStateWithLifecycle()
            PazTheme(darkTheme = isDarkMode) {
                PazNavGraph(startDeepLinkRoute = startRoute)
            }
        }
    }
}
