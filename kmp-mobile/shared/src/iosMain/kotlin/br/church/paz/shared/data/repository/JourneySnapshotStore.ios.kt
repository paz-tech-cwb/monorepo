package br.church.paz.shared.data.repository

import kotlinx.serialization.json.Json
import platform.Foundation.NSUserDefaults

actual fun createJourneySnapshotStore(): JourneySnapshotStore = IosJourneySnapshotStore()

class IosJourneySnapshotStore : JourneySnapshotStore {
    private val defaults = NSUserDefaults.standardUserDefaults

    private fun keyFor(userId: String) = "paz_journey_snapshot_$userId"

    override suspend fun read(userId: String): JourneyProgressSnapshot? {
        val json = defaults.stringForKey(keyFor(userId)) ?: return null
        return runCatching { Json.decodeFromString(JourneyProgressSnapshot.serializer(), json) }.getOrNull()
    }

    override suspend fun save(
        userId: String,
        snapshot: JourneyProgressSnapshot,
    ) {
        defaults.setObject(Json.encodeToString(JourneyProgressSnapshot.serializer(), snapshot), keyFor(userId))
    }
}
