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

    return {
      service,
      em,
      trxManager,
      repo,
      guestOriginsService,
      audit,
      policy,
    };
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

  describe('write authority via sector scope (M1: slug still required)', () => {
    const report = {
      id: 'r1',
      sectorId: 9,
      submittedBy: { id: 99 },
      createdAt: new Date(),
      deletedAt: null,
      guests: [],
    };
    const scope = {
      unrestricted: false,
      areaIds: [],
      sectorIds: [9],
      lifeGroupIds: [],
    };
    const asSlug = (roleSlug: string) => ({ id: 5, roleSlug });

    function setup() {
      const ctx = createService();
      (ctx.repo.findOne as jest.Mock).mockResolvedValue({ ...report });
      (ctx.repo as unknown as { softDelete: jest.Mock }).softDelete = jest
        .fn()
        .mockResolvedValue(undefined);
      return ctx;
    }

    it.each(['sector_leader', 'area_leader'])(
      '%s with the sector in scope bypasses the owner policy on edit and delete',
      async (slug) => {
        const { service, policy } = setup();
        await service.update('r1', {}, asSlug(slug), scope).catch(() => null);
        await service.softDelete('r1', asSlug(slug), scope);
        expect(policy.assertCanEdit).not.toHaveBeenCalled();
        expect(policy.assertCanDelete).not.toHaveBeenCalled();
      },
    );

    it.each(['member', 'life_group_leader'])(
      'a %s holding a sector leader/co-leader row (sector in scope) still goes through the policy',
      async (slug) => {
        const { service, policy } = setup();
        await service.update('r1', {}, asSlug(slug), scope).catch(() => null);
        await service.softDelete('r1', asSlug(slug), scope);
        expect(policy.assertCanEdit).toHaveBeenCalledTimes(1);
        expect(policy.assertCanDelete).toHaveBeenCalledTimes(1);
      },
    );

    it('a sector leader slug without that sector in scope still goes through the policy', async () => {
      const { service, policy } = setup();
      await service.softDelete('r1', asSlug('sector_leader'), {
        ...scope,
        sectorIds: [10],
      });
      expect(policy.assertCanDelete).toHaveBeenCalledTimes(1);
    });

    it('unrestricted scope (admin/pastor) bypasses the policy', async () => {
      const { service, policy } = setup();
      await service.softDelete('r1', asSlug('pastor'), {
        ...scope,
        unrestricted: true,
        sectorIds: [],
      });
      expect(policy.assertCanDelete).not.toHaveBeenCalled();
    });
  });
});
