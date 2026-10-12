import { resolveEligibility } from './eligibility';

describe('resolveEligibility', () => {
  it('explicit eligible=false wins over leader status and attendance', () => {
    expect(
      resolveEligibility({
        explicitEligible: false,
        isLeaderOrCoLeader: true,
        presentCount: 10,
      }),
    ).toEqual({ eligible: false, source: 'manual' });
  });

  it('explicit eligible=true wins over a low present count', () => {
    expect(
      resolveEligibility({
        explicitEligible: true,
        isLeaderOrCoLeader: false,
        presentCount: 0,
      }),
    ).toEqual({ eligible: true, source: 'manual' });
  });

  it('leader/co-leader are eligible without explicit setting', () => {
    expect(
      resolveEligibility({ isLeaderOrCoLeader: true, presentCount: 0 }),
    ).toEqual({ eligible: true, source: 'leader' });
  });

  it('new member is ineligible below the default threshold of 3', () => {
    expect(
      resolveEligibility({
        explicitEligible: null,
        isLeaderOrCoLeader: false,
        presentCount: 2,
      }),
    ).toEqual({ eligible: false, source: 'pending' });
  });

  it('new member becomes auto-eligible at the threshold', () => {
    expect(
      resolveEligibility({ isLeaderOrCoLeader: false, presentCount: 3 }),
    ).toEqual({ eligible: true, source: 'auto' });
  });

  it('honors a per-group min_present_meetings', () => {
    const base = { isLeaderOrCoLeader: false, presentCount: 3 };
    const strict = resolveEligibility({ ...base, minPresentMeetings: 5 });
    const lenient = resolveEligibility({ ...base, minPresentMeetings: 2 });
    expect(strict.eligible).toBe(false);
    expect(lenient.eligible).toBe(true);
  });
});
