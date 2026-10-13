import { ForbiddenException } from '@nestjs/common';
import { getLifeGroupMeetingEditWindowDays } from '../common/constants/life-group-meeting';
import {
  dateKeyOf,
  shiftDays,
  zonedParts,
} from '../life-group-attendance/meeting-day.util';

const DATE_PARTS_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Last day (inclusive, `YYYY-MM-DD`, America/Sao_Paulo calendar day) on which a
 * non-admin may still create/edit the meeting record: meeting date + window.
 */
export function meetingEditDeadline(
  meetingDate: string,
  windowDays = getLifeGroupMeetingEditWindowDays(),
): string {
  const m = DATE_PARTS_RE.exec(meetingDate);
  if (!m) throw new Error(`Invalid meeting date: ${meetingDate}`);
  return dateKeyOf(
    shiftDays(
      { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) },
      windowDays,
    ),
  );
}

/** Today's calendar date in the church timezone. */
export function todayInChurchZone(now: Date = new Date()): string {
  return dateKeyOf(zonedParts(now));
}

export function canEditMeeting(
  actor: { isAdmin: boolean },
  meetingDate: string,
  now: Date = new Date(),
  windowDays = getLifeGroupMeetingEditWindowDays(),
): boolean {
  if (actor.isAdmin) return true;
  // YYYY-MM-DD strings compare chronologically.
  return todayInChurchZone(now) <= meetingEditDeadline(meetingDate, windowDays);
}

export function assertCanEditMeeting(
  actor: { isAdmin: boolean },
  meetingDate: string,
  now: Date = new Date(),
  windowDays = getLifeGroupMeetingEditWindowDays(),
): void {
  if (!canEditMeeting(actor, meetingDate, now, windowDays)) {
    throw new ForbiddenException({
      statusCode: 403,
      error: 'Forbidden',
      code: 'edit_window_closed',
      message: `This meeting can no longer be edited (the edit window closed on ${meetingEditDeadline(meetingDate, windowDays)}). Ask an admin.`,
    });
  }
}
