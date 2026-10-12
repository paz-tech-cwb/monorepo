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

// Life group meeting_day/meeting_time are entered by leaders in the
// church's local timezone, and LifeGroupAttendanceService persists
// meeting_date as a local calendar date. The reminder server always runs in
// UTC, so all weekday/hour/date-key computation below must be done in the
// church's timezone rather than relying on Date's UTC-based getDay()/
// getHours()/toISOString(), or every check silently drifts by the UTC
// offset (and wraps to the wrong calendar day for evening meetings).
export const CHURCH_TIME_ZONE = 'America/Sao_Paulo';

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
}

export function zonedParts(
  date: Date,
  timeZone = CHURCH_TIME_ZONE,
): ZonedParts {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    map[part.type] = part.value;
  }
  // Some locales render midnight as "24" with hour12: false.
  const hour = Number(map.hour) % 24;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
  };
}

// A pure calendar-day computation (weekday of a Y/M/D triple, or a Y/M/D
// triple shifted by N days) is timezone-agnostic, so it's safe to do via
// UTC-anchored Date math regardless of the server's runtime timezone.
export function weekdayOf(
  parts: Pick<ZonedParts, 'year' | 'month' | 'day'>,
): number {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

export function dateKeyOf(
  parts: Pick<ZonedParts, 'year' | 'month' | 'day'>,
): string {
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  return d.toISOString().slice(0, 10);
}

export function shiftDays(
  parts: Pick<ZonedParts, 'year' | 'month' | 'day'>,
  offsetDays: number,
): { year: number; month: number; day: number } {
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

/**
 * Calendar date (`YYYY-MM-DD`, church timezone) of the group's next meeting,
 * counting today when today is the meeting weekday. Returns null when the
 * group has no fixed weekday ("Sem dia fixo" / unset), since there is nothing
 * to compute.
 */
export function nextMeetingDate(
  now: Date,
  meetingDay: string | null | undefined,
): string | null {
  const weekday = meetingDay ? WEEKDAY_INDEX[meetingDay] : undefined;
  if (weekday === undefined) return null;
  const today = zonedParts(now);
  const ahead = (((weekday - weekdayOf(today)) % 7) + 7) % 7;
  return dateKeyOf(shiftDays(today, ahead));
}
