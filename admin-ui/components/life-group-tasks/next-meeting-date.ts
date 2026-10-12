import { addDays, format } from "date-fns"

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
 * today when today is the meeting day. Returns "" for "Sem dia fixo" / unknown
 * labels (the leader then picks the date manually).
 */
export function nextMeetingDate(meetingDay: string | null | undefined, from: Date = new Date()): string {
  if (!meetingDay) return ""
  const target = WEEKDAY_BY_LABEL[meetingDay]
  if (target === undefined) return ""
  const delta = (target - from.getDay() + 7) % 7
  return format(addDays(from, delta), "yyyy-MM-dd")
}
