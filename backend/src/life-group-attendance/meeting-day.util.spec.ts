import {
  CHURCH_TIME_ZONE,
  dateKeyOf,
  nextMeetingDate,
  shiftDays,
  weekdayOf,
  weekdayOfDateString,
  zonedParts,
} from './meeting-day.util';

describe('meeting-day.util', () => {
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
});
