import { EntityManager, Repository } from 'typeorm';
import { CasaDePazReportsService } from './casa-de-paz-reports.service';
import { CasaDePazReport } from './entities/casa-de-paz-report.entity';
import { FormSubmissionPolicyService } from '../forms-core/services/form-submission-policy.service';
import { FormSubmissionAuditService } from '../forms-core/services/form-submission-audit.service';
import { GuestOriginsService } from '../guest-origins/guest-origins.service';

describe('CasaDePazReportsService', () => {
  function createService() {
    // The transactional manager passed into the `em.transaction(cb)`
    // callback below is a distinct object identity from `em` itself
    // (mirroring the real TypeORM transaction manager), so we can assert
    // that guest-origin writes happen on THAT manager, not a bare/pool
    // manager or the injected repo — the whole point of the deadlock fix.
    const trxManager = {
      findOne: jest.fn(),
      save: jest.fn((_entity: unknown, value: unknown) =>
        Promise.resolve(value),
      ),
      create: jest.fn((_entity: unknown, value: unknown) => value),
      delete: jest.fn(),
    };

    const em = {
      transaction: jest.fn((cb: (trx: EntityManager) => unknown) =>
        cb(trxManager as unknown as EntityManager),
      ),
    };

    const repo: Partial<Repository<CasaDePazReport>> = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const policy = {
      assertCanEdit: jest.fn(),
      assertCanDelete: jest.fn(),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const guestOriginsService = {
      ensureForUser: jest.fn().mockResolvedValue({ id: 'origin-1' }),
    };

    const service = new CasaDePazReportsService(
      repo as Repository<CasaDePazReport>,
      em as unknown as EntityManager,
      policy as unknown as FormSubmissionPolicyService,
      audit as unknown as FormSubmissionAuditService,
      guestOriginsService as unknown as GuestOriginsService,
    );

    return { service, em, trxManager, repo, guestOriginsService, audit };
  }

  it('create() resolves new guest users and records their origin on the SAME transactional manager, never the pool', async () => {
    const { service, trxManager, repo, guestOriginsService, audit } =
      createService();

    trxManager.findOne
      .mockResolvedValueOnce(null) // no existing user with this email
      .mockResolvedValueOnce({ slug: 'guest', id: 9 }); // guest role lookup
    (trxManager.save as jest.Mock).mockImplementation(
      (entity: unknown, value: Record<string, unknown>) => {
        if (typeof entity === 'function' && entity.name === 'User') {
          return Promise.resolve({ ...value, id: 42 });
        }
        if (typeof entity === 'function' && entity.name === 'CasaDePazReport') {
          return Promise.resolve({ ...value, id: 'report-1' });
        }
        return Promise.resolve(value);
      },
    );
    (repo.findOne as jest.Mock).mockResolvedValue({
      id: 'report-1',
      guests: [],
    });

    await service.create(
      {
        date: '2026-06-10',
        facilitator: 'Ana',
        sectorId: 1,
        casaDePazId: 'cycle-1',
        guests: [
          {
            name: 'Novo Convidado',
            email: 'novo@example.com',
            birthDate: '2000-01-01',
          },
        ],
      } as never,
      7,
    );

    expect(guestOriginsService.ensureForUser).toHaveBeenCalledTimes(1);
    const call = guestOriginsService.ensureForUser.mock.calls[0] as [
      number,
      { originType: string; casaDePazId: string },
      EntityManager,
    ];
    const [userIdArg, inputArg, managerArg] = call;
    expect(userIdArg).toBe(42);
    expect(inputArg).toEqual({
      originType: 'casa_de_paz',
      casaDePazId: 'cycle-1',
    });
    // This is the crux of the deadlock fix: the manager passed to
    // ensureForUser must be the exact same transactional manager instance
    // used to create/save the User row above, not a separate connection.
    expect(managerArg).toBe(trxManager);
    expect(audit.record).toHaveBeenCalled();
  });
});
