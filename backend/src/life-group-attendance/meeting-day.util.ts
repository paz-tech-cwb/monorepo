// Maps the Portuguese weekday labels used by admin-ui/mobile life group
// forms (see admin-ui MEETING_DAYS) to JS Date#getDay() indices. Any life
// group whose meeting_day isn't one of these fixed weekdays (i.e. "Sem dia
// fixo") has no computable meeting weekday and callers must treat that as
// "unknown" rather than guessing.
export const WEEKDAY_INDEX: Record<string, number> = {
  Domingo: 0,
  'Segunda-feira': 1,
  'Terça-feira': 2,
  'Quarta-feira': 3,
  'Quinta-feira': 4,
  'Sexta-feira': 5,
  Sábado: 6,
};

/**
 * Weekday index (0=Sunday..6=Saturday) of a plain `YYYY-MM-DD` calendar date
 * string. Deliberately timezone-independent: the string's Y/M/D components
 * are interpreted as UTC-midnight so the result never drifts based on the
 * server's local timezone or DST — a calendar date has one weekday,
 * regardless of what time of day it is anywhere.
 */
export function weekdayOfDateString(dateString: string): number {
  return new Date(`${dateString}T00:00:00.000Z`).getUTCDay();
}
