import { ForbiddenException } from '@nestjs/common';
import {
  assertCanEditMeeting,
  canEditMeeting,
  meetingEditDeadline,
  todayInChurchZone,
} from './meeting-edit-policy';
import {
  getLifeGroupMeetingEditWindowDays,
  LIFE_GROUP_MEETING_EDIT_WINDOW_DAYS,
} from '../common/constants/life-group-meeting';

describe('meeting edit policy', () => {
  const member = { isAdmin: false };
  const admin = { isAdmin: true };

  it('defaults to a single 14 day constant', () => {
    expect(LIFE_GROUP_MEETING_EDIT_WINDOW_DAYS).toBe(14);
    expect(getLifeGroupMeetingEditWindowDays({})).toBe(14);
  });

  it.each([
    ['', 14],
    ['21', 21],
    ['0', 14],
    ['-3', 14],
    ['abc', 14],
    ['2.5', 14],
  ])('env override %j -> %d days', (raw, expected) => {
    expect(
      getLifeGroupMeetingEditWindowDays({
        LIFE_GROUP_MEETING_EDIT_WINDOW_DAYS: raw,
      } as NodeJS.ProcessEnv),
    ).toBe(expected);
  });

  it('computes the deadline across month and year boundaries', () => {
    expect(meetingEditDeadline('2026-09-30', 14)).toBe('2026-10-14');
    expect(meetingEditDeadline('2026-12-25', 14)).toBe('2027-01-08');
    expect(meetingEditDeadline('2028-02-20', 14)).toBe('2028-03-05');
  });

  it('uses Sao Paulo calendar days (UTC-3), not UTC', () => {
    // 2026-10-15T02:59Z is still Oct 14 in Sao Paulo.
    expect(todayInChurchZone(new Date('2026-10-15T02:59:00Z'))).toBe(
      '2026-10-14',
    );
    expect(todayInChurchZone(new Date('2026-10-15T03:00:00Z'))).toBe(
      '2026-10-15',
    );
  });

  describe('window with jest fake timers', () => {
    afterEach(() => jest.useRealTimers());

    it('allows day 14 (last day, until 23:59 Sao Paulo) and denies day 15', () => {
      jest.useFakeTimers({ now: new Date('2026-10-14T01:00:00Z') });
      expect(canEditMeeting(member, '2026-09-30')).toBe(true);
      jest.setSystemTime(new Date('2026-10-15T02:59:59Z'));
      expect(canEditMeeting(member, '2026-09-30')).toBe(true);
      jest.setSystemTime(new Date('2026-10-15T03:00:00Z'));
      expect(canEditMeeting(member, '2026-09-30')).toBe(false);
      expect(() => assertCanEditMeeting(member, '2026-09-30')).toThrow(
        ForbiddenException,
      );
    });

    it('never blocks admin', () => {
      jest.useFakeTimers({ now: new Date('2027-10-15T12:00:00Z') });
      expect(canEditMeeting(admin, '2026-09-30')).toBe(true);
      expect(() => assertCanEditMeeting(admin, '2026-09-30')).not.toThrow();
    });

    it('honors the env override at call time', () => {
      jest.useFakeTimers({ now: new Date('2026-10-20T12:00:00Z') });
      expect(canEditMeeting(member, '2026-09-30')).toBe(false);
      process.env.LIFE_GROUP_MEETING_EDIT_WINDOW_DAYS = '30';
      try {
        expect(canEditMeeting(member, '2026-09-30')).toBe(true);
      } finally {
        delete process.env.LIFE_GROUP_MEETING_EDIT_WINDOW_DAYS;
      }
    });
  });
});
