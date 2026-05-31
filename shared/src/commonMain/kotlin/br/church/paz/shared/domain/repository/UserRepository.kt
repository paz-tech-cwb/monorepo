package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.DeviceToken
import br.church.paz.shared.domain.model.NotificationPreferences
import br.church.paz.shared.domain.model.UpdateProfileRequest
import br.church.paz.shared.domain.model.User

interface UserRepository {
    suspend fun getProfile(): Result<User>
    suspend fun updateProfile(request: UpdateProfileRequest): Result<User>
    suspend fun getNotificationPreferences(): Result<NotificationPreferences>
    suspend fun updateNotificationPreferences(prefs: NotificationPreferences): Result<NotificationPreferences>
    suspend fun registerDeviceToken(token: DeviceToken): Result<Unit>
    suspend fun removeDeviceToken(tokenId: String): Result<Unit>
}
