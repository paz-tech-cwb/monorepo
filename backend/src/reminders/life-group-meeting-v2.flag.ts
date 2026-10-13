/**
 * Server flag for the merged "meeting" reminders (phase 2 of the attendance +
 * report merge): new primary push copy, the daily report follow-up and the
 * sector-leader escalation. DEFAULT OFF: with the flag unset or any value other
 * than `true`/`1`, the attendance reminder behaves exactly as before the merge.
 *
 * Read at runtime on every evaluator run (not cached at import time), so the
 * value is whatever the process environment holds when the tick fires.
 *
 * Switch-on order (see .ai/features/notifications.md): release the app builds
 * with the combined screen, confirm adoption, set LIFE_GROUP_MEETING_V2=true in
 * the backend environment and restart.
 */
export const LIFE_GROUP_MEETING_V2_ENV = 'LIFE_GROUP_MEETING_V2';

export function isLifeGroupMeetingV2Enabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const raw = env[LIFE_GROUP_MEETING_V2_ENV]?.trim().toLowerCase();
  return raw === 'true' || raw === '1';
}
