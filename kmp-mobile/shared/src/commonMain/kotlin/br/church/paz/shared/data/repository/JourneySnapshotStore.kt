package br.church.paz.shared.data.repository

import kotlinx.serialization.Serializable

/**
 * Per-user snapshot of a member's journey progress, used only to detect what changed
 * between loads (the backend only ever returns absolute progress, never a diff).
 */
@Serializable
data class JourneyProgressSnapshot(
    /** Track key -> last known progress percentage (0-100). */
    val trackProgress: Map<String, Int> = emptyMap(),
    /** Set of "trackKey#stepIndex" identifiers for steps that were completed last snapshot. */
    val completedSteps: Set<String> = emptySet(),
)

/**
 * Persists [JourneyProgressSnapshot] keyed by user id so a shared device switching accounts
 * never leaks one member's "level up" state into another's.
 */
interface JourneySnapshotStore {
    suspend fun read(userId: String): JourneyProgressSnapshot?

    suspend fun save(
        userId: String,
        snapshot: JourneyProgressSnapshot,
    )
}

expect fun createJourneySnapshotStore(): JourneySnapshotStore
