package br.church.paz.android

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.lifecycleScope
import br.church.paz.android.navigation.PazNavGraph
import br.church.paz.android.notifications.PazFirebaseMessagingService
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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        PushNotificationHelper.requestPermissionIfNeeded(this, lifecycleScope, userRepository)

        val startRoute =
            intent
                .getStringExtra(PazFirebaseMessagingService.EXTRA_DEEP_LINK)
                ?.also { intent.removeExtra(PazFirebaseMessagingService.EXTRA_DEEP_LINK) }
                ?.let { PushNotificationHelper.parseDeepLink(it) }

        setContent {
            val isDarkMode by themeManager.isDarkMode.collectAsStateWithLifecycle()
            PazTheme(darkTheme = isDarkMode) {
                PazNavGraph(startDeepLinkRoute = startRoute)
            }
        }
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
