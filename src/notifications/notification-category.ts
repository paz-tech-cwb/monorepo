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
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];
