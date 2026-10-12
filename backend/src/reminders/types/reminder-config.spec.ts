import {
  DEFAULT_CONFIGS,
  FormReportReminderConfig,
  LifeGroupTasksReminderConfig,
  validateReminderConfig,
} from './reminder-config';
import { FORM_SLUGS } from '../../forms-catalog/forms-catalog.service';

// Regression guard for the "forms deep-link 404" investigation: the forms
// catalog is slug-keyed, and every reminder config referencing a form_slug
// must resolve to a real catalog entry.
describe('DEFAULT_CONFIGS.form_report', () => {
  it('every configured form_slug resolves to a real forms-catalog slug', () => {
    const { forms } = DEFAULT_CONFIGS.form_report as FormReportReminderConfig;
    for (const entry of forms) {
      expect(FORM_SLUGS).toContain(entry.form_slug);
    }
  });
});

describe('DEFAULT_CONFIGS.life_group_tasks', () => {
  const cfg = DEFAULT_CONFIGS.life_group_tasks as LifeGroupTasksReminderConfig;

  it('defaults to offsets [3, 1] at 09:00 with a valid shape', () => {
    expect(cfg.days_before_meeting).toEqual([3, 1]);
    expect(cfg.hour).toBe(9);
    expect(validateReminderConfig('life_group_tasks', cfg)).toBeNull();
    for (const key of [
      'title',
      'message',
      'reminder_title',
      'reminder_message',
    ] as const) {
      expect(cfg[key].length).toBeGreaterThan(0);
    }
  });

  it('has a default config for every rule type', () => {
    expect(Object.keys(DEFAULT_CONFIGS).sort()).toEqual([
      'event',
      'form_report',
      'life_group_attendance',
      'life_group_tasks',
      'member_journey',
    ]);
  });
});

describe('validateReminderConfig', () => {
  it('only constrains life_group_tasks', () => {
    expect(validateReminderConfig('event', { anything: 1 })).toBeNull();
  });

  it('rejects bad offsets and hours for life_group_tasks', () => {
    const base = { ...DEFAULT_CONFIGS.life_group_tasks };
    expect(
      validateReminderConfig('life_group_tasks', {
        ...base,
        days_before_meeting: [],
      }),
    ).not.toBeNull();
    expect(
      validateReminderConfig('life_group_tasks', {
        ...base,
        days_before_meeting: [3, -1],
      }),
    ).not.toBeNull();
    expect(
      validateReminderConfig('life_group_tasks', { ...base, hour: 24 }),
    ).not.toBeNull();
    expect(validateReminderConfig('life_group_tasks', null)).not.toBeNull();
  });
});
