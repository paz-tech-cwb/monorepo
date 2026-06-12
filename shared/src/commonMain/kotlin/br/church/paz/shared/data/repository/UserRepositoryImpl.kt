package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.DeviceToken
import br.church.paz.shared.domain.model.NotificationPreferences
import br.church.paz.shared.domain.model.UpdateNotificationPrefsDto
import br.church.paz.shared.domain.model.UpdateProfileRequest
import br.church.paz.shared.domain.model.User
import br.church.paz.shared.domain.repository.UserRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.put
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType

class UserRepositoryImpl(private val client: HttpClient) : UserRepository {

    @Throws(Exception::class)
    override suspend fun getProfile(): User =
        client.get("api/users/me").body()

    @Throws(Exception::class)
    override suspend fun updateProfile(request: UpdateProfileRequest): User =
        client.put("api/users/me") {
            contentType(ContentType.Application.Json)
            setBody(request)
        }.body()

    @Throws(Exception::class)
    override suspend fun getNotificationPreferences(): NotificationPreferences =
        client.get("api/users/me/notification-preferences").body()

    @Throws(Exception::class)
    override suspend fun updateNotificationPreferences(dto: UpdateNotificationPrefsDto) {
        client.put("api/users/me/notification-preferences") {
            contentType(ContentType.Application.Json)
            setBody(dto)
        }
    }

    @Throws(Exception::class)
    override suspend fun registerDeviceToken(token: DeviceToken) {
        client.post("api/users/device-tokens") {
            contentType(ContentType.Application.Json)
            setBody(token)
        }
    }

    @Throws(Exception::class)
    override suspend fun removeDeviceToken(tokenId: String) {
        client.delete("api/users/device-tokens/$tokenId")
    }
}
