export const NOTIFICATION_CATEGORIES = [
  'events',
  'announcements',
  'life_group',
  'academy',
  'admin_alerts',
  'forms',
  'member_journey',
  'contributions',
  'meeting_reports',
  'life_group_study',
  // Deliberately excluded from CATEGORY_PREF_MAP (notification-dispatch.service.ts):
  // attendance reminders are core to the leader's job and must not be
  // opt-outable, same as `forms` reminders.
  'life_group_attendance',
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];
