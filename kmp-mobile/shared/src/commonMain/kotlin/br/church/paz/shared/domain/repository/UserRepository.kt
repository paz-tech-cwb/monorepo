package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.DeviceToken
import br.church.paz.shared.domain.model.NotificationPreferences
import br.church.paz.shared.domain.model.UpdateNotificationPrefsDto
import br.church.paz.shared.domain.model.UpdateProfileRequest
import br.church.paz.shared.domain.model.User

interface UserRepository {
    @Throws(Exception::class)
    suspend fun getProfile(): User
    @Throws(Exception::class)
    suspend fun updateProfile(request: UpdateProfileRequest): User
    @Throws(Exception::class)
    suspend fun getNotificationPreferences(): NotificationPreferences
    @Throws(Exception::class)
    suspend fun updateNotificationPreferences(dto: UpdateNotificationPrefsDto)
    @Throws(Exception::class)
    suspend fun registerDeviceToken(token: DeviceToken)
    @Throws(Exception::class)
    suspend fun removeDeviceToken(tokenId: String)
}
