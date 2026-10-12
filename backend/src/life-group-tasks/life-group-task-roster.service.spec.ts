import { EntityManager } from 'typeorm';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { LifeGroupTaskRosterService } from './life-group-task-roster.service';

const leader = { id: 10, name: 'Lia', status: 'active' };
const bob = { id: 1, name: 'Bob', status: 'active' };
const ana = { id: 2, name: 'Ana', status: 'active' };

function makeRoster(opts: {
  presentRows: unknown[];
  joinedRows?: unknown[];
  minPresent?: number;
}) {
  const em = {
    findOne: jest
      .fn()
      .mockResolvedValue(
        opts.minPresent === undefined
          ? null
          : { minPresentMeetings: opts.minPresent },
      ),
    find: jest.fn().mockResolvedValue([]),
    query: jest.fn((sql: string) =>
      Promise.resolve(
        sql.includes('life_group_attendance_entries')
          ? opts.presentRows
          : (opts.joinedRows ?? []),
      ),
    ),
  };
  const roster = new LifeGroupTaskRosterService(em as unknown as EntityManager);
  const group = {
    id: 7,
    leader,
    coLeader: null,
    users: [bob, ana],
  } as unknown as LifeGroup;
  return { roster, em, group };
}

describe('LifeGroupTaskRosterService joined_at rule (decision 11)', () => {
  it('counts attendance only from the join date: query joins user_life_groups and filters meeting_date >= joined_at', async () => {
    const { roster, em, group } = makeRoster({ presentRows: [] });
    await roster.resolveRoster(group);
    const sql = (em.query.mock.calls as [string][])
      .map((c) => c[0])
      .find((q) => q.includes('life_group_attendance_entries')) as string;
    expect(sql).toContain('LEFT JOIN user_life_groups');
    expect(sql).toContain('e.present = true');
    expect(sql).toContain('ulg.joined_at IS NULL');
    expect(sql).toContain('a.meeting_date >=');
    expect(sql).toContain('AT TIME ZONE $2');
  });

  it('uses the (already join-filtered) count against min_present_meetings', async () => {
    const { roster, group } = makeRoster({
      // DB already dropped stale rows: Bob 3 counted, Ana only 2.
      presentRows: [
        { user_id: 1, present_count: 3 },
        { user_id: 2, present_count: 2 },
      ],
    });
    const { members } = await roster.resolveRoster(group);
    expect(members.find((m) => m.user.id === 1)).toMatchObject({
      eligible: true,
      source: 'auto',
      presentCount: 3,
    });
    expect(members.find((m) => m.user.id === 2)).toMatchObject({
      eligible: false,
      source: 'pending',
    });
  });

  it('keeps the leader eligible regardless of attendance and exposes joinedAt only for join-table members', async () => {
    const { roster, group } = makeRoster({
      presentRows: [],
      joinedRows: [{ user_id: 1, joined_at: '2026-05-01T12:00:00.000Z' }],
    });
    const { members } = await roster.resolveRoster(group);
    expect(members.find((m) => m.user.id === 10)).toMatchObject({
      eligible: true,
      source: 'leader',
      joinedAt: null,
    });
    expect(members.find((m) => m.user.id === 1)?.joinedAt).toEqual(
      new Date('2026-05-01T12:00:00.000Z'),
    );
  });
});
