import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';
import {
  assertDateNotInFuture,
  LifeGroupReportCreatePolicy,
} from './life-group-report-create-policy';
import { CreateLifeGroupReportDto } from './dto/create-life-group-report.dto';

const NO_SCOPE: ResolvedScope = {
  unrestricted: false,
  areaIds: [],
  sectorIds: [],
  lifeGroupIds: [],
};
const ADMIN_SCOPE: ResolvedScope = { ...NO_SCOPE, unrestricted: true };

function dto(over: Partial<CreateLifeGroupReportDto> = {}) {
  return {
    date: '2020-01-05',
    lifeGroupId: 10,
    areaId: 999,
    sectorId: 888,
    ...over,
  } as CreateLifeGroupReportDto;
}

function group(over: Record<string, unknown> = {}) {
  return {
    id: 10,
    leader: { id: 1 },
    coLeader: { id: 2 },
    sector: { id: 20, area: { id: 30 } },
    ...over,
  };
}

function make(found: unknown) {
  const em = { findOne: jest.fn().mockResolvedValue(found) };
  const policy = new LifeGroupReportCreatePolicy(
    em as unknown as EntityManager,
  );
  return { policy, em };
}

describe('LifeGroupReportCreatePolicy', () => {
  it('lets the leader create and derives area/sector from the group (ignoring client values)', async () => {
    const { policy } = make(group());
    const out = await policy.authorizeAndDerive(dto(), NO_SCOPE, { id: 1 });
    expect(out.areaId).toBe(30);
    expect(out.sectorId).toBe(20);
    expect(out.lifeGroupId).toBe(10);
  });

  it('lets a member-role co-leader create (explicit co_leader_id fallback, empty scope)', async () => {
    const { policy } = make(group());
    await expect(
      policy.authorizeAndDerive(dto(), NO_SCOPE, { id: 2 }),
    ).resolves.toMatchObject({ areaId: 30, sectorId: 20 });
  });

  it('lets a leader of two groups create for either via scope', async () => {
    const scope = { ...NO_SCOPE, lifeGroupIds: [10, 11] };
    const a = make(group({ id: 10, leader: { id: 7 } }));
    const b = make(group({ id: 11, leader: { id: 7 } }));
    await expect(
      a.policy.authorizeAndDerive(dto({ lifeGroupId: 10 }), scope, { id: 7 }),
    ).resolves.toBeDefined();
    await expect(
      b.policy.authorizeAndDerive(dto({ lifeGroupId: 11 }), scope, { id: 7 }),
    ).resolves.toBeDefined();
  });

  it('lets an area/sector supervisor create for a group in scope', async () => {
    const { policy } = make(group({ leader: { id: 50 }, coLeader: null }));
    await expect(
      policy.authorizeAndDerive(
        dto(),
        { ...NO_SCOPE, areaIds: [30], sectorIds: [20], lifeGroupIds: [10] },
        { id: 99 },
      ),
    ).resolves.toBeDefined();
  });

  it('rejects a supervisor for a group outside their scope with 403', async () => {
    const { policy } = make(group({ leader: { id: 50 }, coLeader: null }));
    await expect(
      policy.authorizeAndDerive(
        dto(),
        { ...NO_SCOPE, areaIds: [31], sectorIds: [21], lifeGroupIds: [11] },
        { id: 99 },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a plain member with 403', async () => {
    const { policy } = make(group());
    await expect(
      policy.authorizeAndDerive(dto(), NO_SCOPE, { id: 500 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects another group's leader with 403", async () => {
    const { policy } = make(group());
    await expect(
      policy.authorizeAndDerive(
        dto(),
        { ...NO_SCOPE, lifeGroupIds: [11] },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows admin/pastor (unrestricted) for any existing group', async () => {
    const { policy } = make(group({ leader: null, coLeader: null }));
    await expect(
      policy.authorizeAndDerive(dto(), ADMIN_SCOPE, { id: 1000 }),
    ).resolves.toMatchObject({ areaId: 30, sectorId: 20 });
  });

  it('answers 404 for an unknown group (even for admin)', async () => {
    const { policy } = make(null);
    await expect(
      policy.authorizeAndDerive(dto(), ADMIN_SCOPE, { id: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('answers 422 when the group has no sector', async () => {
    const { policy } = make(group({ sector: null }));
    await expect(
      policy.authorizeAndDerive(dto(), NO_SCOPE, { id: 1 }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('answers 422 when the sector has no area', async () => {
    const { policy } = make(group({ sector: { id: 20, area: null } }));
    await expect(
      policy.authorizeAndDerive(dto(), ADMIN_SCOPE, { id: 1 }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('checks access before reporting missing sector/area (no info for outsiders)', async () => {
    const { policy } = make(group({ sector: null }));
    await expect(
      policy.authorizeAndDerive(dto(), NO_SCOPE, { id: 500 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a future date with 400 before touching the database', async () => {
    const { policy, em } = make(group());
    await expect(
      policy.authorizeAndDerive(dto({ date: '2999-01-01' }), NO_SCOPE, {
        id: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(em.findOne).not.toHaveBeenCalled();
  });

  it('does not mutate the incoming dto', async () => {
    const { policy } = make(group());
    const input = dto();
    await policy.authorizeAndDerive(input, NO_SCOPE, { id: 1 });
    expect(input.areaId).toBe(999);
  });
});

describe('assertDateNotInFuture (America/Sao_Paulo calendar day)', () => {
  // 2026-10-14T01:30Z is still 2026-10-13 22:30 in Sao Paulo (UTC-3).
  const lateEveningSp = new Date('2026-10-14T01:30:00Z');

  it('accepts the Sao Paulo "today" even when UTC is already tomorrow', () => {
    expect(() =>
      assertDateNotInFuture('2026-10-13', lateEveningSp),
    ).not.toThrow();
  });

  it('rejects the UTC "today" when it is still tomorrow in Sao Paulo', () => {
    expect(() => assertDateNotInFuture('2026-10-14', lateEveningSp)).toThrow(
      BadRequestException,
    );
  });

  it('accepts past dates and full ISO strings of today', () => {
    expect(() =>
      assertDateNotInFuture('2026-10-01', lateEveningSp),
    ).not.toThrow();
    expect(() =>
      assertDateNotInFuture('2026-10-13T20:00:00-03:00', lateEveningSp),
    ).not.toThrow();
  });
});
