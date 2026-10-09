import { NotificationCategory } from './notification-category';

export const CATEGORY_CHANNEL_MAP: Record<NotificationCategory, string> = {
  events: 'paz_events',
  announcements: 'paz_announcements',
  life_group: 'paz_life_group',
  life_group_study: 'paz_life_group_study',
  life_group_attendance: 'paz_life_group',
  academy: 'paz_academy',
  member_journey: 'paz_member_journey',
  contributions: 'paz_contributions',
  admin_alerts: 'paz_admin_alerts',
  forms: 'paz_admin_alerts',
  meeting_reports: 'paz_admin_alerts',
};

export const DEFAULT_NOTIFICATION_CHANNEL = 'paz_events';
