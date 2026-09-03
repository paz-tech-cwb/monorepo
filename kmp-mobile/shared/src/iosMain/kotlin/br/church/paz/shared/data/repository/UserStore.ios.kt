package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.User
import kotlinx.serialization.json.Json
import platform.Foundation.NSUserDefaults

actual fun createUserStore(): UserStore = IosUserStore()

class IosUserStore : UserStore {
    private val defaults = NSUserDefaults.standardUserDefaults
    private val KEY = "paz_user_json"

    override suspend fun save(user: User) {
        defaults.setObject(Json.encodeToString(User.serializer(), user), KEY)
    }

    override suspend fun read(): User? {
        val json = defaults.stringForKey(KEY) ?: return null
        return runCatching { Json.decodeFromString(User.serializer(), json) }.getOrNull()
    }

    override suspend fun clear() {
        defaults.removeObjectForKey(KEY)
    }
}
