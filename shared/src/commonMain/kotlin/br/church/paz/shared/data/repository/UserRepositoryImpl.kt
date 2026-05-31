package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.DeviceToken
import br.church.paz.shared.domain.model.NotificationPreferences
import br.church.paz.shared.domain.model.UpdateProfileRequest
import br.church.paz.shared.domain.model.User
import br.church.paz.shared.domain.repository.UserRepository
import br.church.paz.shared.util.safeRunCatching
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.patch
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

class UserRepositoryImpl(private val client: HttpClient) : UserRepository {

    override suspend fun getProfile(): Result<User> = safeRunCatching {
        client.get("/users/me").body()
    }

    override suspend fun updateProfile(request: UpdateProfileRequest): Result<User> = safeRunCatching {
        client.patch("/users/me") {
            contentType(ContentType.Application.Json)
            setBody(request)
        }.body()
    }

    override suspend fun getNotificationPreferences(): Result<NotificationPreferences> = safeRunCatching {
        client.get("/users/me/notification-preferences").body()
    }

    override suspend fun updateNotificationPreferences(
        prefs: NotificationPreferences,
    ): Result<NotificationPreferences> = safeRunCatching {
        client.patch("/users/me/notification-preferences") {
            contentType(ContentType.Application.Json)
            setBody(prefs)
        }.body()
    }

    override suspend fun registerDeviceToken(token: DeviceToken): Result<Unit> = safeRunCatching {
        client.post("/users/device-tokens") {
            contentType(ContentType.Application.Json)
            setBody(token)
        }
        Unit
    }

    override suspend fun removeDeviceToken(tokenId: String): Result<Unit> = safeRunCatching {
        client.delete("/users/device-tokens/$tokenId")
        Unit
    }
}
