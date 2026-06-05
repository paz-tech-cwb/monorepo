package br.church.paz.android.ui.features.notifications

data class NotificationPrefsUiState(
    val eventsNotifications: Boolean = true,
    val announcementsNotifications: Boolean = true,
    val lifeGroupNotifications: Boolean = true,
    val isSaving: Boolean = false,
    val error: String? = null,
    val saveSuccess: Boolean = false,
)

sealed class NotificationPrefsEffect {
    data object SaveSuccess : NotificationPrefsEffect()

    data object NavigateBack : NotificationPrefsEffect()
}
