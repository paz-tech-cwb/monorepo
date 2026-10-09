package br.church.paz.android.ui.features.lifegroupanalytics

import br.church.paz.shared.domain.model.LifeGroupAttendancePoint
import br.church.paz.shared.domain.model.LifeGroupDistributionBucket
import br.church.paz.shared.domain.model.LifeGroupOverview

enum class DistributionTab { DAY, HOUR, NEIGHBORHOOD, CITY }

data class LifeGroupAnalyticsUiState(
    // True ONLY for the genuine first load, before any content has ever
    // rendered — the screen shows the full skeleton in this state. Every
    // subsequent filter-triggered reload uses `isRefreshing` instead so the
    // filter row (and any already-rendered content) stays mounted.
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val year: Int,
    val month: Int? = null,
    val lifeGroupId: Int? = null,
    // Populated from the scoped `overview.lifeGroups`, not the unscoped
    // GET /api/life-groups, so this dropdown can never offer a group that
    // 403s on attendance/distribution.
    val lifeGroups: List<Pair<Int, String>> = emptyList(),
    val attendanceRows: List<LifeGroupAttendancePoint> = emptyList(),
    val distributionTab: DistributionTab = DistributionTab.DAY,
    val byDay: List<LifeGroupDistributionBucket> = emptyList(),
    val byHour: List<LifeGroupDistributionBucket> = emptyList(),
    val byNeighborhood: List<LifeGroupDistributionBucket> = emptyList(),
    val byCity: List<LifeGroupDistributionBucket> = emptyList(),
    // Loaded best-effort alongside attendance/distribution — a failure here
    // must never break the rest of the report, so it's a separate nullable
    // field, not folded into the main error state.
    val overview: LifeGroupOverview? = null,
    // Reserved for a truly unexpected failure outside the per-section
    // attendance/distribution handling below (e.g. the load coroutine itself
    // throwing before either call resolves) — kept separate from the
    // section-scoped errors so a single unexpected exception doesn't need to
    // be force-fit into one of them.
    val error: String? = null,
    // Attendance and distribution are independent endpoints (and independent
    // charts) — each tracks its own inline error (including a 403, as
    // defense in depth for root cause B) so a failure on one never hides the
    // other's successfully-loaded content, or the always-independent
    // `overview` section.
    val attendanceError: String? = null,
    val distributionError: String? = null,
) {
    val distributionForSelectedTab: List<LifeGroupDistributionBucket>
        get() =
            when (distributionTab) {
                DistributionTab.DAY -> byDay
                DistributionTab.HOUR -> byHour
                DistributionTab.NEIGHBORHOOD -> byNeighborhood
                DistributionTab.CITY -> byCity
            }
}

sealed class LifeGroupAnalyticsEffect {
    data object NavigateBack : LifeGroupAnalyticsEffect()
}
