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
