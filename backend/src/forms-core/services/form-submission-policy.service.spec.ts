import { FormSubmissionPolicyService } from './form-submission-policy.service';

describe('FormSubmissionPolicyService', () => {
  const policy = new FormSubmissionPolicyService();
  const fresh = { submittedById: 1, createdAt: new Date(), deletedAt: null };
  const stale = {
    submittedById: 1,
    createdAt: new Date(Date.now() - 25 * 3600_000),
    deletedAt: null,
  };

  it('admin can edit anything', () => {
    expect(policy.canEdit({ id: 99, roleSlug: 'admin' }, stale)).toBe(true);
  });
  it('owner can edit within 24h', () => {
    expect(policy.canEdit({ id: 1, roleSlug: 'member' }, fresh)).toBe(true);
  });
  it('owner cannot edit after 24h', () => {
    expect(policy.canEdit({ id: 1, roleSlug: 'member' }, stale)).toBe(false);
  });
  it('non-owner cannot edit', () => {
    expect(policy.canEdit({ id: 2, roleSlug: 'pastor' }, fresh)).toBe(false);
  });
  it('only admin can delete', () => {
    expect(policy.canDelete({ id: 1, roleSlug: 'pastor' })).toBe(false);
    expect(policy.canDelete({ id: 1, roleSlug: 'admin' })).toBe(true);
  });
});
