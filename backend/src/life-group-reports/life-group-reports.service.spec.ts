import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { LifeGroupReportsService } from './life-group-reports.service';
import { LifeGroupReport } from './entities/life-group-report.entity';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';
import { FormSubmissionPolicyService } from '../forms-core/services/form-submission-policy.service';
import { FormSubmissionAuditService } from '../forms-core/services/form-submission-audit.service';

const NO_SCOPE: ResolvedScope = {
  unrestricted: false,
  areaIds: [],
  sectorIds: [],
  lifeGroupIds: [],
};

function makeReport(overrides: Partial<LifeGroupReport> = {}): LifeGroupReport {
  return Object.assign(new LifeGroupReport(), {
    id: 'r-1',
    date: '2026-10-01',
    areaId: 1,
    sectorId: 2,
    lifeGroupId: 10,
    committedMembers: 8,
    committedMembersPresent: 6,
    kids0To11: 2,
    guests: 1,
    mdas: 0,
    offering: '12.50',
    committedAtTadel: 3,
    committedAtCulto: 4,
    leaderAttended: ['tadel'],
    disciplesCount: 2,
    disciplesDiscipledThisWeek: 1,
    pastoringActivityType: ['visit'],
    pastoringActivityOther: null,
    trainingActivityType: [],
    trainingActivityOther: null,
    submittedBy: { id: 7, name: 'Leader' },
    createdAt: new Date('2026-10-02T10:00:00Z'),
    updatedAt: new Date('2026-10-02T10:00:00Z'),
    deletedAt: null,
    ...overrides,
  } as Partial<LifeGroupReport>);
}

describe('LifeGroupReportsService', () => {
  function createService(ledGroupIds: number[] = []) {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([makeReport()]),
    };
    const repo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      save: jest.fn(),
      create: jest.fn((v: unknown) => v),
      softDelete: jest.fn(),
    };
    const lgQb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawMany: jest
        .fn()
        .mockResolvedValue(ledGroupIds.map((id) => ({ id: String(id) }))),
    };
    const em = { createQueryBuilder: jest.fn().mockReturnValue(lgQb) };
    const policy = { assertCanEdit: jest.fn(), assertCanDelete: jest.fn() };
    const audit = {
      record: jest.fn().mockResolvedValue(undefined),
      listForSubmission: jest.fn().mockResolvedValue([{ id: 'a1' }]),
    };
    const service = new LifeGroupReportsService(
      repo as unknown as Repository<LifeGroupReport>,
      em as unknown as EntityManager,
      policy as unknown as FormSubmissionPolicyService,
      audit as unknown as FormSubmissionAuditService,
    );
    return { service, repo, qb, em, lgQb, audit, policy };
  }

  describe('toResponse', () => {
    it('maps to snake_case including submitted_by and string offering', () => {
      const { service } = createService();
      const res = service.toResponse(makeReport());
      expect(res).toEqual({
        id: 'r-1',
        date: '2026-10-01',
        area_id: 1,
        sector_id: 2,
        life_group_id: 10,
        committed_members: 8,
        committed_members_present: 6,
        kids_0_to_11: 2,
        guests: 1,
        mdas: 0,
        offering: '12.50',
        committed_at_tadel: 3,
        committed_at_culto: 4,
        leader_attended: ['tadel'],
        disciples_count: 2,
        disciples_discipled_this_week: 1,
        pastoring_activity_type: ['visit'],
        pastoring_activity_other: null,
        training_activity_type: [],
        training_activity_other: null,
        submitted_by: { id: 7, name: 'Leader' },
        created_at: new Date('2026-10-02T10:00:00Z'),
        updated_at: new Date('2026-10-02T10:00:00Z'),
        deleted_at: null,
      });
    });

    it('tolerates a missing submittedBy relation', () => {
      const { service } = createService();
      const res = service.toResponse(
        makeReport({ submittedBy: undefined as never }),
      );
      expect(res.submitted_by).toBeNull();
    });
  });

  describe('list', () => {
    const actor = { id: 50 };

    it('does not restrict for unrestricted scope and skips the led-groups lookup', async () => {
      const { service, qb, em } = createService();
      const res = await service.list(
        { ...NO_SCOPE, unrestricted: true },
        actor,
      );
      expect(res).toHaveLength(1);
      expect(res[0].life_group_id).toBe(10);
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(em.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('unrestricted + life_group_id filters to that group', async () => {
      const { service, qb } = createService();
      await service.list({ ...NO_SCOPE, unrestricted: true }, actor, 33);
      expect(qb.andWhere).toHaveBeenCalledWith('f.life_group_id = ANY(:lgs)', {
        lgs: [33],
      });
    });

    it('scoped area/sector leader sees the scope groups', async () => {
      const { service, qb } = createService();
      await service.list({ ...NO_SCOPE, lifeGroupIds: [1, 2] }, actor);
      expect(qb.andWhere).toHaveBeenCalledWith('f.life_group_id = ANY(:lgs)', {
        lgs: [1, 2],
      });
    });

    it('co-leader with role member sees the group they co-lead (fallback)', async () => {
      const { service, qb } = createService([10]);
      await service.list(NO_SCOPE, actor);
      expect(qb.andWhere).toHaveBeenCalledWith('f.life_group_id = ANY(:lgs)', {
        lgs: [10],
      });
    });

    it('leader of two groups sees both, de-duplicated against scope', async () => {
      const { service, qb } = createService([10, 11]);
      await service.list({ ...NO_SCOPE, lifeGroupIds: [10] }, actor);
      expect(qb.andWhere).toHaveBeenCalledWith('f.life_group_id = ANY(:lgs)', {
        lgs: [10, 11],
      });
    });

    it('plain member with no groups gets nothing (1=0)', async () => {
      const { service, qb } = createService([]);
      await service.list(NO_SCOPE, actor);
      expect(qb.andWhere).toHaveBeenCalledWith('1=0');
    });

    it('allows a life_group_id filter inside scope or led groups', async () => {
      const { service, qb } = createService([10]);
      await service.list({ ...NO_SCOPE, lifeGroupIds: [3] }, actor, 10);
      expect(qb.andWhere).toHaveBeenCalledWith('f.life_group_id = ANY(:lgs)', {
        lgs: [10],
      });
      await service.list({ ...NO_SCOPE, lifeGroupIds: [3] }, actor, 3);
      expect(qb.andWhere).toHaveBeenLastCalledWith(
        'f.life_group_id = ANY(:lgs)',
        { lgs: [3] },
      );
    });

    it('rejects a life_group_id filter outside scope with 403', async () => {
      const { service, repo } = createService([10]);
      await expect(
        service.list({ ...NO_SCOPE, lifeGroupIds: [3] }, actor, 99),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('findOne / auditLog scope enforcement', () => {
    const actor = { id: 50 };

    it('returns the report for an unrestricted actor', async () => {
      const { service, repo } = createService();
      repo.findOne.mockResolvedValue(makeReport());
      const res = await service.findOne(
        'r-1',
        { ...NO_SCOPE, unrestricted: true },
        actor,
      );
      expect(res.id).toBe('r-1');
    });

    it('returns the report when its group is in scope', async () => {
      const { service, repo } = createService();
      repo.findOne.mockResolvedValue(makeReport());
      const res = await service.findOne(
        'r-1',
        { ...NO_SCOPE, lifeGroupIds: [10] },
        actor,
      );
      expect(res.life_group_id).toBe(10);
    });

    it('returns the report to the leader/co-leader of that group', async () => {
      const { service, repo } = createService([10]);
      repo.findOne.mockResolvedValue(makeReport());
      await expect(service.findOne('r-1', NO_SCOPE, actor)).resolves.toEqual(
        expect.objectContaining({ id: 'r-1' }),
      );
    });

    it('returns the report to its submitter', async () => {
      const { service, repo } = createService();
      repo.findOne.mockResolvedValue(makeReport());
      await expect(
        service.findOne('r-1', NO_SCOPE, { id: 7 }),
      ).resolves.toEqual(expect.objectContaining({ id: 'r-1' }));
    });

    it('answers 404 for an out-of-scope actor', async () => {
      const { service, repo } = createService([11]);
      repo.findOne.mockResolvedValue(makeReport());
      await expect(
        service.findOne('r-1', { ...NO_SCOPE, lifeGroupIds: [3] }, actor),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('answers 404 for a plain member', async () => {
      const { service, repo } = createService([]);
      repo.findOne.mockResolvedValue(makeReport());
      await expect(
        service.findOne('r-1', NO_SCOPE, actor),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('answers 404 when the report does not exist', async () => {
      const { service, repo } = createService();
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.findOne('x', { ...NO_SCOPE, unrestricted: true }, actor),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('auditLog returns the trail only when the report is visible', async () => {
      const { service, repo, audit } = createService([10]);
      repo.findOne.mockResolvedValue(makeReport());
      await expect(service.auditLog('r-1', NO_SCOPE, actor)).resolves.toEqual([
        { id: 'a1' },
      ]);
      expect(audit.listForSubmission).toHaveBeenCalledWith(
        'life-group-reports',
        'r-1',
      );
    });

    it('auditLog answers 404 and does not read the trail when out of scope', async () => {
      const { service, repo, audit } = createService([]);
      repo.findOne.mockResolvedValue(makeReport());
      await expect(
        service.auditLog('r-1', NO_SCOPE, actor),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(audit.listForSubmission).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('keeps the unscoped load, applies the edit policy and returns snake_case', async () => {
      const { service, repo, policy } = createService();
      const entity = makeReport();
      repo.findOne.mockResolvedValue(entity);
      repo.save.mockImplementation((m: LifeGroupReport) => Promise.resolve(m));
      const res = await service.update('r-1', { guests: 5 } as never, {
        id: 7,
        roleSlug: 'life_group_leader',
      });
      expect(policy.assertCanEdit).toHaveBeenCalled();
      expect(res.guests).toBe(5);
      expect(res.life_group_id).toBe(10);
    });
  });
});
