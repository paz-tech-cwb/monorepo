package br.church.paz.android.ui.features.lifegroupmeeting

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

/** Material3's date picker works in UTC-midnight millis; the API in ISO `yyyy-MM-dd`. */
internal fun isoToUtcMillis(iso: String): Long? =
    try {
        LocalDate.parse(iso).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
    } catch (e: java.time.format.DateTimeParseException) {
        null
    }

internal fun utcMillisToIso(utcMillis: Long): String = Instant.ofEpochMilli(utcMillis).atZone(ZoneOffset.UTC).toLocalDate().toString()

private val isoDatePattern = Regex("^\\d{4}-\\d{2}-\\d{2}$")

/** Route arguments of the meeting screen: a numeric group id and an ISO date (push deep links are external input). */
internal fun isValidMeetingArguments(
    lifeGroupId: String,
    date: String,
): Boolean = lifeGroupId.toIntOrNull() != null && isoDatePattern.matches(date) && isoToUtcMillis(date) != null
