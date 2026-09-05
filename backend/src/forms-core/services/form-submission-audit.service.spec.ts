import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FormSubmissionAuditLog } from '../entities/form-submission-audit-log.entity';
import { FormSubmissionAuditService } from './form-submission-audit.service';

describe('FormSubmissionAuditService', () => {
  let service: FormSubmissionAuditService;
  let repo: { insert: jest.Mock; find: jest.Mock };

  beforeEach(async () => {
    repo = {
      insert: jest.fn().mockResolvedValue({}),
      find: jest.fn().mockResolvedValue([]),
    };
    const m = await Test.createTestingModule({
      providers: [
        FormSubmissionAuditService,
        { provide: getRepositoryToken(FormSubmissionAuditLog), useValue: repo },
      ],
    }).compile();
    service = m.get(FormSubmissionAuditService);
  });

  it('records a create with the actor and form metadata', async () => {
    await service.record({
      formSlug: 'guests',
      submissionId: 'abc',
      actorId: 7,
      action: 'create',
    });
    expect(repo.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        formSlug: 'guests',
        submissionId: 'abc',
        action: 'create',
      }),
    );
  });
});
