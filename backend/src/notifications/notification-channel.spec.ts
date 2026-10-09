import { NOTIFICATION_CATEGORIES } from './notification-category';
import { CATEGORY_CHANNEL_MAP } from './notification-channel';

// Source of truth for valid Android channel ids:
// kmp-mobile/android/src/main/kotlin/br/church/paz/android/notifications/PazFirebaseMessagingService.kt
// This list is hand-copied from that file's `CHANNELS` constant — it is NOT generated or
// imported, so it must be updated manually whenever `CHANNELS` changes there.
const VALID_ANDROID_CHANNEL_IDS = [
  'paz_events',
  'paz_announcements',
  'paz_life_group',
  'paz_life_group_study',
  'paz_academy',
  'paz_member_journey',
  'paz_contributions',
  'paz_admin_alerts',
];

describe('CATEGORY_CHANNEL_MAP', () => {
  it('has an entry for every NotificationCategory (exhaustiveness)', () => {
    const mappedKeys = Object.keys(CATEGORY_CHANNEL_MAP).sort();
    const categories = [...NOTIFICATION_CATEGORIES].sort();
    expect(mappedKeys).toEqual(categories);
  });

  it('maps every category to a real Android channel id', () => {
    for (const category of NOTIFICATION_CATEGORIES) {
      expect(VALID_ANDROID_CHANNEL_IDS).toContain(
        CATEGORY_CHANNEL_MAP[category],
      );
    }
  });
});
