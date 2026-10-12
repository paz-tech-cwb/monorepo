package br.church.paz.android.ui.features.ministries

import br.church.paz.shared.domain.model.LifeGroup

/**
 * "Quinta-feira às 20:00" — the meeting day/time line shared by the life group detail and the
 * home card. Missing parts are omitted; null when both are blank (e.g. "Sem dia fixo" is shown
 * as-is, since it is the backend's `meetingDay` value).
 */
internal fun lifeGroupMeetingLabel(lifeGroup: LifeGroup): String? {
    val day = lifeGroup.meetingDay?.takeIf { it.isNotEmpty() }
    val time = lifeGroup.meetingTime?.takeIf { it.isNotEmpty() }
    return when {
        day != null && time != null -> "$day às $time"
        day != null -> day
        time != null -> time
        else -> null
    }
}
