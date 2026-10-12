// Same timezone the backend uses for meeting dates (backend CHURCH_TIME_ZONE).
const CHURCH_TIME_ZONE = "America/Sao_Paulo"

// Mirrors the backend weekday labels (backend `meeting-day.util.ts`);
// JS getDay(): 0 = Sunday.
const WEEKDAY_BY_LABEL: Record<string, number> = {
  "Domingo": 0,
  "Segunda-feira": 1,
  "Terça-feira": 2,
  "Quarta-feira": 3,
  "Quinta-feira": 4,
  "Sexta-feira": 5,
  "Sábado": 6,
}

/**
 * Next meeting date (yyyy-MM-dd) for a life group's fixed weekday, counting
 * today when today is the meeting day. "Today" is the calendar date in the
 * church timezone (America/Sao_Paulo), not the browser's. Returns "" for
 * "Sem dia fixo" / unknown labels (the leader then picks the date manually).
 */
export function nextMeetingDate(meetingDay: string | null | undefined, from: Date = new Date()): string {
  if (!meetingDay) return ""
  const target = WEEKDAY_BY_LABEL[meetingDay]
  if (target === undefined) return ""

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CHURCH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(from)
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  // Pure calendar math on a UTC-anchored date: no local timezone/DST involved.
  const today = new Date(Date.UTC(part("year"), part("month") - 1, part("day")))
  const delta = (target - today.getUTCDay() + 7) % 7
  today.setUTCDate(today.getUTCDate() + delta)
  return today.toISOString().slice(0, 10)
}
