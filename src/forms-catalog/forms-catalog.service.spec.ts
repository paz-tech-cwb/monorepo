import { FormsCatalogService } from './forms-catalog.service';

describe('FormsCatalogService', () => {
  const s = new FormsCatalogService();

  it('admin sees all 8 forms with read+write', () => {
    const r = s.listForRole('admin');
    expect(r).toHaveLength(8);
    expect(r.every((f) => f.can_read && f.can_write)).toBe(true);
  });

  it('member sees nothing', () => {
    expect(s.listForRole('member')).toHaveLength(0);
  });

  it('life_group_leader sees 5 forms', () => {
    expect(s.listForRole('life_group_leader')).toHaveLength(5);
  });
});
