import {
  CHURCH_TIME_ZONE,
  dateKeyOf,
  isoWeekRange,
  nextMeetingDate,
  shiftDays,
  weekdayOf,
  weekdayOfDateString,
  zonedDateTimeToDate,
  zonedParts,
} from './meeting-day.util';

describe('meeting-day.util', () => {
  it('isoWeekRange returns Monday..Sunday around any date', () => {
    // 2026-10-14 is a Wednesday.
    expect(isoWeekRange('2026-10-14')).toEqual({
      start: '2026-10-12',
      end: '2026-10-18',
    });
    expect(isoWeekRange('2026-10-12')).toEqual({
      start: '2026-10-12',
      end: '2026-10-18',
    });
    expect(isoWeekRange('2026-10-18')).toEqual({
      start: '2026-10-12',
      end: '2026-10-18',
    });
    // Across a month/year boundary.
    expect(isoWeekRange('2027-01-01')).toEqual({
      start: '2026-12-28',
      end: '2027-01-03',
    });
  });

  it('zonedParts uses the church timezone, not UTC', () => {
    expect(CHURCH_TIME_ZONE).toBe('America/Sao_Paulo');
    // 01:30 UTC on the 11th is 22:30 on the 10th in Sao Paulo.
    expect(zonedParts(new Date('2026-06-11T01:30:00Z'))).toEqual({
      year: 2026,
      month: 6,
      day: 10,
      hour: 22,
    });
  });

  it('weekdayOf, dateKeyOf and shiftDays are calendar-only helpers', () => {
    const parts = { year: 2026, month: 6, day: 10 };
    expect(weekdayOf(parts)).toBe(3);
    expect(dateKeyOf(parts)).toBe('2026-06-10');
    expect(dateKeyOf(shiftDays(parts, 25))).toBe('2026-07-05');
    expect(dateKeyOf(shiftDays(parts, -10))).toBe('2026-05-31');
    expect(weekdayOfDateString('2026-06-10')).toBe(3);
  });

  describe('nextMeetingDate', () => {
    it('returns today when today is the meeting weekday', () => {
      expect(
        nextMeetingDate(new Date('2026-06-10T08:00:00-03:00'), 'Quarta-feira'),
      ).toBe('2026-06-10');
    });

    it('returns the upcoming weekday otherwise', () => {
      expect(
        nextMeetingDate(new Date('2026-06-11T08:00:00-03:00'), 'Quarta-feira'),
      ).toBe('2026-06-17');
      expect(
        nextMeetingDate(new Date('2026-06-07T08:00:00-03:00'), 'Sábado'),
      ).toBe('2026-06-13');
    });

    it('uses the church calendar day, not the UTC one', () => {
      // 02:00 UTC on Thursday the 11th is still Wednesday the 10th locally.
      expect(
        nextMeetingDate(new Date('2026-06-11T02:00:00Z'), 'Quarta-feira'),
      ).toBe('2026-06-10');
    });

    it('rolls over month and year boundaries', () => {
      expect(
        nextMeetingDate(new Date('2026-12-30T12:00:00-03:00'), 'Domingo'),
      ).toBe('2027-01-03');
    });

    it('is null without a fixed weekday', () => {
      expect(nextMeetingDate(new Date(), 'Sem dia fixo')).toBeNull();
      expect(nextMeetingDate(new Date(), null)).toBeNull();
    });
  });

  describe('zonedDateTimeToDate', () => {
    it('converts a Sao Paulo wall-clock time (UTC-3) to the UTC instant, minutes included', () => {
      expect(zonedDateTimeToDate('2026-06-10', 19, 0).toISOString()).toBe(
        '2026-06-10T22:00:00.000Z',
      );
      expect(zonedDateTimeToDate('2026-06-10', 21, 30).toISOString()).toBe(
        '2026-06-11T00:30:00.000Z',
      );
      expect(zonedDateTimeToDate('2026-06-10', 0, 0).toISOString()).toBe(
        '2026-06-10T03:00:00.000Z',
      );
    });

    it('honors another zone and round-trips through zonedParts', () => {
      const d = zonedDateTimeToDate('2026-01-15', 8, 15, 'America/New_York');
      expect(d.toISOString()).toBe('2026-01-15T13:15:00.000Z');
      expect(zonedParts(zonedDateTimeToDate('2026-06-10', 23, 30)).hour).toBe(
        23,
      );
    });
  });
});
