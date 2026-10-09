package br.church.paz.shared.domain.model

/**
 * One date-grouped section of Casa de Paz report submissions, already filtered down to a
 * single cycle. Sections are expected to be rendered as collapsible groups in a flat list.
 */
data class CasaDePazReportSection(
    val date: String,
    val submissions: List<CasaDePazReportSubmission>,
)

/**
 * Groups [submissions] belonging to [selectedCycleId] by date, sorted descending (newest
 * first). Pure function — no I/O, no platform APIs — so both Android and iOS UIs can share
 * the exact same grouping behavior and it can be unit tested independently of any
 * ViewModel/Composable/SwiftUI View.
 */
fun buildCasaDePazReportSections(
    submissions: List<CasaDePazReportSubmission>,
    selectedCycleId: String,
): List<CasaDePazReportSection> =
    submissions
        .filter { it.casaDePazId == selectedCycleId }
        .groupBy { it.date }
        .map { (date, submissionsForDate) -> CasaDePazReportSection(date, submissionsForDate) }
        .sortedByDescending { it.date }

/**
 * Picks the cycle that should be pre-selected when the Casa de Paz reports screen first
 * loads: the cycle of the newest submission by date, falling back to the newest cycle by
 * month if there are no submissions at all. Returns `null` if there are no cycles either.
 */
fun defaultCasaDePazCycleSelection(
    submissions: List<CasaDePazReportSubmission>,
    cycles: List<CasaDePazCycle>,
): String? {
    val newestSubmissionCycleId = submissions.maxByOrNull { it.date }?.casaDePazId
    if (newestSubmissionCycleId != null && cycles.any { it.id == newestSubmissionCycleId }) {
        return newestSubmissionCycleId
    }
    return cycles.maxByOrNull { it.month }?.id
}
