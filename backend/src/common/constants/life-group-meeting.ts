// Edit window for a life group meeting record (attendance + report): the
// record can be created/edited until `meeting date + N days` (inclusive,
// America/Sao_Paulo calendar days). Admin is never bound by it. Product
// decision Q5. Single source of truth: change it here, or override per
// environment with LIFE_GROUP_MEETING_EDIT_WINDOW_DAYS (positive integer).
export const LIFE_GROUP_MEETING_EDIT_WINDOW_DAYS = 14;

export function getLifeGroupMeetingEditWindowDays(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env.LIFE_GROUP_MEETING_EDIT_WINDOW_DAYS;
  if (raw === undefined || raw.trim() === '') {
    return LIFE_GROUP_MEETING_EDIT_WINDOW_DAYS;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return LIFE_GROUP_MEETING_EDIT_WINDOW_DAYS;
  }
  return parsed;
}

// Extra meetings (a meeting on a weekday other than the group's fixed
// `meeting_day`, explicitly flagged by the client). At most this many may be
// created per group per ISO week (Monday-Sunday of the meeting date): enough
// for real life (a special service, a make-up meeting) while a mistyped date
// cannot be flagged over and over. Admin is bound by it too.
export const LIFE_GROUP_MAX_EXTRA_MEETINGS_PER_WEEK = 3;

// Of the extra meetings of one group in one ISO week, only the earliest counts
// toward a member's task-eligibility "present meetings" total (see
// LifeGroupTaskRosterService): extras are real meetings, but they must not let
// a leader inflate eligibility by flagging several in a week.
export const LIFE_GROUP_COUNTED_EXTRA_MEETINGS_PER_WEEK = 1;
