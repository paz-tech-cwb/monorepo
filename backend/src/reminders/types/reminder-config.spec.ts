import {
  DEFAULT_CONFIGS,
  FormReportReminderConfig,
  LifeGroupTasksReminderConfig,
  resolveLifeGroupAttendanceConfig,
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
  it('only constrains life_group_tasks and life_group_attendance', () => {
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

describe('life_group_attendance config', () => {
  const defaults = { ...DEFAULT_CONFIGS.life_group_attendance };

  it('defaults are valid and carry the documented follow-up cadence', () => {
    expect(
      validateReminderConfig('life_group_attendance', defaults),
    ).toBeNull();
    expect(defaults).toMatchObject({
      hours_after_meeting_start: 2,
      followup_hour: 9,
      followup_interval_days: 1,
      followup_max_days: 5,
      escalation_after_days: 5,
    });
  });

  it('accepts a legacy row that lacks every V2 field', () => {
    expect(
      validateReminderConfig('life_group_attendance', {
        hours_after_meeting_start: 2,
        title: 'Lançar presença do Life Group',
        message: 'A reunião já começou.',
      }),
    ).toBeNull();
  });

  it.each([
    ['followup_hour', 24],
    ['followup_hour', -1],
    ['followup_hour', 9.5],
    ['followup_hour', '9'],
    ['followup_interval_days', 0],
    ['followup_interval_days', 8],
    ['followup_max_days', -1],
    ['followup_max_days', 15],
    ['escalation_after_days', 15],
    ['escalation_after_days', 1.5],
    ['hours_after_meeting_start', 24],
    ['hours_after_meeting_start', null],
    ['followup_title', ''],
    ['followup_message', '   '],
    ['escalation_title', 5],
    ['meeting_message', 'x'.repeat(501)],
  ])('rejects %s = %p', (key, value) => {
    expect(
      validateReminderConfig('life_group_attendance', {
        ...defaults,
        [key]: value,
      }),
    ).toContain(key);
  });

  it('keeps accepting a blank legacy title/message (flag-off saves are unchanged)', () => {
    expect(
      validateReminderConfig('life_group_attendance', {
        ...defaults,
        title: '',
        message: '  ',
      }),
    ).toBeNull();
  });

  it('allows 0 to switch the follow-up and the escalation off', () => {
    expect(
      validateReminderConfig('life_group_attendance', {
        ...defaults,
        followup_max_days: 0,
        escalation_after_days: 0,
      }),
    ).toBeNull();
  });

  it('rejects a non-object config', () => {
    expect(
      validateReminderConfig('life_group_attendance', null),
    ).not.toBeNull();
    expect(validateReminderConfig('life_group_attendance', [])).not.toBeNull();
    expect(validateReminderConfig('life_group_attendance', 'x')).not.toBeNull();
  });

  it('resolveLifeGroupAttendanceConfig fills missing and invalid fields from the defaults', () => {
    const resolved = resolveLifeGroupAttendanceConfig({
      title: 'legacy',
      followup_hour: 99,
      followup_max_days: 3,
    });
    expect(resolved.title).toBe('legacy');
    expect(resolved.followup_hour).toBe(9);
    expect(resolved.followup_max_days).toBe(3);
    expect(resolved.escalation_after_days).toBe(5);
    expect(resolved.followup_title).toBe(defaults.followup_title);
    expect(resolveLifeGroupAttendanceConfig(null)).toEqual(defaults);
  });
});
