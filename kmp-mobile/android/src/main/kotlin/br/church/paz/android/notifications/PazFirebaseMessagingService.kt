package br.church.paz.android.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import br.church.paz.android.MainActivity
import br.church.paz.shared.domain.model.DevicePlatform
import br.church.paz.shared.domain.model.DeviceToken
import br.church.paz.shared.domain.repository.UserRepository
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.koin.android.ext.android.inject

class PazFirebaseMessagingService : FirebaseMessagingService() {
    private val userRepository: UserRepository by inject()
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        serviceScope.launch {
            userRepository.registerDeviceToken(
                DeviceToken(token = token, platform = DevicePlatform.android),
            )
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        val title = message.notification?.title ?: message.data["title"] ?: return
        val body = message.notification?.body ?: message.data["body"] ?: ""
        val deepLink = message.data["deep_link"]
        val channelId = message.data["channel_id"] ?: CHANNELS.first().first

        ensureChannels(applicationContext)
        showNotification(title, body, deepLink, channelId)
    }

    private fun showNotification(
        title: String,
        body: String,
        deepLink: String?,
        channelId: String,
    ) {
        val intent =
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                deepLink?.let { putExtra(EXTRA_DEEP_LINK, it) }
            }

        val pendingIntent =
            PendingIntent.getActivity(
                this,
                0,
                intent,
                PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE,
            )

        val notification =
            NotificationCompat
                .Builder(this, channelId)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .build()

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(System.currentTimeMillis().toInt(), notification)
    }

    private fun ensureChannels(context: Context) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        CHANNELS.forEach { (id, name) ->
            if (manager.getNotificationChannel(id) == null) {
                manager.createNotificationChannel(
                    NotificationChannel(id, name, NotificationManager.IMPORTANCE_DEFAULT),
                )
            }
        }
    }

    companion object {
        const val EXTRA_DEEP_LINK = "deep_link"

        val CHANNELS =
            listOf(
                "paz_events" to "Eventos",
                "paz_announcements" to "Avisos",
                "paz_life_group" to "Grupo de Vida",
                "paz_life_group_study" to "Estudo do Life",
                "paz_academy" to "Academia",
                "paz_member_journey" to "Jornada do Membro",
                "paz_contributions" to "Contribuições",
                "paz_admin_alerts" to "Alertas Administrativos",
            )
    }
}
