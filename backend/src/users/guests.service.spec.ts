import { GuestsService } from './guests.service';
import { User } from './entities/user.entity';

function buildManagerMock(rows: unknown[]) {
  return {
    query: jest.fn().mockResolvedValue(rows),
  };
}

function buildScopeResolverMock(resolve: unknown) {
  return { resolve: jest.fn().mockResolvedValue(resolve) };
}

const adminActor = { id: 1, role: { slug: 'admin' } } as User;

describe('GuestsService', () => {
  it('filters to active guest-role users only (delegated to the SQL WHERE clause) and maps fields', async () => {
    const manager = buildManagerMock([
      {
        id: 1,
        name: 'Ana Convidada',
        phone: '+5541999990000',
        email: 'ana@example.com',
        picture: null,
        created_at: new Date('2026-09-01T00:00:00Z'),
        total_steps: '3',
        completed_steps: '1',
      },
    ]);
    const scopeResolver = buildScopeResolverMock({ unrestricted: true });
    const service = new GuestsService(manager as never, scopeResolver as never);

    const result = await service.findGuests(adminActor);

    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('r."slug" = \'guest\''),
      expect.anything(),
    );
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('u."status" = \'active\''),
      expect.anything(),
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: 1,
        name: 'Ana Convidada',
        phone: '+5541999990000',
        email: 'ana@example.com',
        picture: null,
        progress: {
          completed_steps: 1,
          total_steps: 3,
          progress_percentage: 33,
        },
      }),
    ]);
  });

  it('orders oldest-first (delegated to the SQL ORDER BY clause)', async () => {
    const manager = buildManagerMock([]);
    const scopeResolver = buildScopeResolverMock({ unrestricted: true });
    const service = new GuestsService(manager as never, scopeResolver as never);

    await service.findGuests(adminActor);

    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY u."created_at" ASC'),
      expect.anything(),
    );
  });

  it('computes days_as_guest from created_at', async () => {
    const createdAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const manager = buildManagerMock([
      {
        id: 2,
        name: 'Bruno Convidado',
        phone: null,
        email: null,
        picture: null,
        created_at: createdAt,
        total_steps: '0',
        completed_steps: '0',
      },
    ]);
    const scopeResolver = buildScopeResolverMock({ unrestricted: true });
    const service = new GuestsService(manager as never, scopeResolver as never);

    const [guest] = await service.findGuests(adminActor);

    expect(guest.days_as_guest).toBe(5);
  });

  it('handles a null phone gracefully', async () => {
    const manager = buildManagerMock([
      {
        id: 3,
        name: 'Sem Telefone',
        phone: null,
        email: 'sem@example.com',
        picture: null,
        created_at: new Date(),
        total_steps: '2',
        completed_steps: '0',
      },
    ]);
    const scopeResolver = buildScopeResolverMock({ unrestricted: true });
    const service = new GuestsService(manager as never, scopeResolver as never);

    const [guest] = await service.findGuests(adminActor);

    expect(guest.phone).toBeNull();
  });

  it('does not crash on zero-progress (no tracked steps) and reports 0%', async () => {
    const manager = buildManagerMock([
      {
        id: 4,
        name: 'Zero Progress',
        phone: '+5541999990001',
        email: 'zero@example.com',
        picture: null,
        created_at: new Date(),
        total_steps: '0',
        completed_steps: '0',
      },
    ]);
    const scopeResolver = buildScopeResolverMock({ unrestricted: true });
    const service = new GuestsService(manager as never, scopeResolver as never);

    const [guest] = await service.findGuests(adminActor);

    expect(guest.progress).toEqual({
      completed_steps: 0,
      total_steps: 0,
      progress_percentage: 0,
    });
  });

  it('returns an empty array with no db rows', async () => {
    const manager = buildManagerMock([]);
    const scopeResolver = buildScopeResolverMock({ unrestricted: true });
    const service = new GuestsService(manager as never, scopeResolver as never);

    const result = await service.findGuests(adminActor);

    expect(result).toEqual([]);
  });

  it('admin/pastor get an unrestricted (all guests) query with no scope filter appended', async () => {
    const manager = buildManagerMock([]);
    const scopeResolver = buildScopeResolverMock({ unrestricted: true });
    const service = new GuestsService(manager as never, scopeResolver as never);

    await service.findGuests(adminActor);

    const [sql] = manager.query.mock.calls[0] as [string];
    expect(sql).not.toContain('area_id');
    expect(sql).not.toContain('sector_id" = ANY');
  });

  it('a life_group_leader/sector_leader/area_leader with no matching scope gets an empty array, not an error or all guests', async () => {
    const manager = buildManagerMock([
      {
        id: 1,
        name: 'Ana Convidada',
        phone: null,
        email: null,
        picture: null,
        created_at: new Date(),
        total_steps: '0',
        completed_steps: '0',
      },
    ]);
    const scopeResolver = buildScopeResolverMock({
      unrestricted: false,
      areaIds: [],
      sectorIds: [],
      lifeGroupIds: [],
    });
    const service = new GuestsService(manager as never, scopeResolver as never);

    const lifeGroupLeaderActor = {
      id: 2,
      role: { slug: 'life_group_leader' },
    } as User;

    const result = await service.findGuests(lifeGroupLeaderActor);

    expect(result).toEqual([]);
    // Scoped roles with an empty scope must short-circuit before hitting the DB.
    expect(manager.query).not.toHaveBeenCalled();
  });

  it('applies area/sector/life-group scope conditions to the SQL when the actor has a non-empty scope', async () => {
    const manager = buildManagerMock([]);
    const scopeResolver = buildScopeResolverMock({
      unrestricted: false,
      areaIds: [100],
      sectorIds: [10],
      lifeGroupIds: [1],
    });
    const service = new GuestsService(manager as never, scopeResolver as never);

    const sectorLeaderActor = {
      id: 3,
      role: { slug: 'sector_leader' },
    } as User;

    await service.findGuests(sectorLeaderActor);

    const [sql, params] = manager.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('area_id" = ANY');
    expect(sql).toContain('u."sector_id" = ANY');
    expect(sql).toContain('life_group_id" = ANY');
    expect(params).toEqual([[100], [10], [1]]);
  });
});
