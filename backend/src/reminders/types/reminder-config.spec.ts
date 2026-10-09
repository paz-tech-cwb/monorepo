import { DEFAULT_CONFIGS, FormReportReminderConfig } from './reminder-config';
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
