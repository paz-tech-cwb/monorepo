package br.church.paz.shared.domain.usecase

import br.church.paz.shared.data.repository.JourneyProgressSnapshot
import br.church.paz.shared.data.repository.JourneySnapshotStore
import br.church.paz.shared.data.repository.UserStore
import br.church.paz.shared.domain.model.MemberJourney

/**
 * The backend only ever returns absolute journey progress, never "what changed since last
 * time" — this use case fills that gap by diffing the freshly fetched [MemberJourney] against
 * a locally persisted per-user snapshot, so the UI knows which steps just completed (progress
 * fill animation) and which tracks just hit 100% (full celebration).
 *
 * On a user's very first-ever load there is no prior snapshot to diff against, so nothing is
 * reported as "newly" completed — we only seed the snapshot silently. Otherwise every
 * already-completed track/step would incorrectly fire a celebration the first time the screen
 * is opened.
 */
class DetectJourneyLevelUpUseCase(
    private val snapshotStore: JourneySnapshotStore,
    private val userStore: UserStore,
) {
    data class Result(
        val newlyCompletedStepKeys: Set<String> = emptySet(),
        val newlyCompletedTrackKeys: Set<String> = emptySet(),
    )

    suspend operator fun invoke(journey: MemberJourney): Result {
        val userId = userStore.read()?.id ?: return Result()
        val previous = snapshotStore.read(userId)
        val current = journey.toSnapshot()
        snapshotStore.save(userId, current)

        if (previous == null) {
            // First-ever snapshot for this user: seed silently, no retroactive celebrations.
            return Result()
        }

        val newlyCompletedSteps = current.completedSteps - previous.completedSteps

        val newlyCompletedTracks =
            journey.tracks
                .asSequence()
                .filter { it.progressPercentage >= 100 }
                .filter { (previous.trackProgress[it.key] ?: 0) < 100 }
                .map { it.key }
                .toSet()

        return Result(
            newlyCompletedStepKeys = newlyCompletedSteps,
            newlyCompletedTrackKeys = newlyCompletedTracks,
        )
    }

    private fun MemberJourney.toSnapshot(): JourneyProgressSnapshot {
        val trackProgress = tracks.associate { it.key to it.progressPercentage }
        val completedSteps =
            tracks
                .flatMap { track ->
                    track.steps.mapIndexedNotNull { index, step ->
                        if (step.completed) "${track.key}#$index" else null
                    }
                }.toSet()
        return JourneyProgressSnapshot(trackProgress = trackProgress, completedSteps = completedSteps)
    }
}
