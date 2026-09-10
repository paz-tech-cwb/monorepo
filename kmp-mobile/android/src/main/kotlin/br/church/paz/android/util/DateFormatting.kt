package br.church.paz.android.util

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException

private val isoDateFormatter: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE
private val brDateFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy")

/**
 * The backend/wire format for plain calendar dates everywhere in the app
 * (e.g. `meeting_date`) is ISO `yyyy-MM-dd` — this converts it to the
 * Brazilian `dd/MM/yyyy` display convention used throughout the UI. Returns
 * the original string unchanged if it isn't a valid ISO date, so a
 * malformed value never disappears from the screen.
 */
fun brDateString(isoDate: String): String =
    try {
        LocalDate.parse(isoDate, isoDateFormatter).format(brDateFormatter)
    } catch (e: DateTimeParseException) {
        isoDate
    }
