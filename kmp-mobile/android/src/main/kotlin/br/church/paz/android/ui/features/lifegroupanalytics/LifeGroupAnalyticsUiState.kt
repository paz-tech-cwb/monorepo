package br.church.paz.android.ui.features.lifegroupanalytics

import br.church.paz.shared.domain.model.LifeGroupAttendancePoint
import br.church.paz.shared.domain.model.LifeGroupDistributionBucket
import br.church.paz.shared.domain.model.LifeGroupOverview

enum class DistributionTab { DAY, HOUR, NEIGHBORHOOD, CITY }

data class LifeGroupAnalyticsUiState(
    val isLoading: Boolean = true,
    val year: Int,
    val month: Int? = null,
    val lifeGroupId: Int? = null,
    val lifeGroups: List<Pair<Int, String>> = emptyList(),
    val attendanceRows: List<LifeGroupAttendancePoint> = emptyList(),
    val distributionTab: DistributionTab = DistributionTab.DAY,
    val byDay: List<LifeGroupDistributionBucket> = emptyList(),
    val byHour: List<LifeGroupDistributionBucket> = emptyList(),
    val byNeighborhood: List<LifeGroupDistributionBucket> = emptyList(),
    val byCity: List<LifeGroupDistributionBucket> = emptyList(),
    // Loaded best-effort alongside attendance/distribution — a failure here
    // must never break the rest of the report (same precedent as
    // loadLifeGroups()), so it's a separate nullable field, not folded into
    // the main error state.
    val overview: LifeGroupOverview? = null,
    val error: String? = null,
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
