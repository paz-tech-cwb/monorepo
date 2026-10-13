import {
  LIFE_GROUP_MEETING_V2_ENV,
  isLifeGroupMeetingV2Enabled,
} from './life-group-meeting-v2.flag';

describe('isLifeGroupMeetingV2Enabled', () => {
  it('is off by default', () => {
    expect(isLifeGroupMeetingV2Enabled({})).toBe(false);
  });

  it.each(['', 'false', '0', 'no', 'off', 'enabled'])(
    'is off for %p',
    (value) => {
      expect(
        isLifeGroupMeetingV2Enabled({ [LIFE_GROUP_MEETING_V2_ENV]: value }),
      ).toBe(false);
    },
  );

  it.each(['true', 'TRUE', ' true ', '1'])('is on for %p', (value) => {
    expect(
      isLifeGroupMeetingV2Enabled({ [LIFE_GROUP_MEETING_V2_ENV]: value }),
    ).toBe(true);
  });

  it('reads process.env at call time (no caching)', () => {
    const original = process.env[LIFE_GROUP_MEETING_V2_ENV];
    try {
      delete process.env[LIFE_GROUP_MEETING_V2_ENV];
      expect(isLifeGroupMeetingV2Enabled()).toBe(false);
      process.env[LIFE_GROUP_MEETING_V2_ENV] = 'true';
      expect(isLifeGroupMeetingV2Enabled()).toBe(true);
    } finally {
      if (original === undefined) delete process.env[LIFE_GROUP_MEETING_V2_ENV];
      else process.env[LIFE_GROUP_MEETING_V2_ENV] = original;
    }
  });
});
