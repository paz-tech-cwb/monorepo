import { EntityManager } from 'typeorm';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { isoWeekRange } from '../life-group-attendance/meeting-day.util';
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

describe('LifeGroupTaskRosterService extra meeting eligibility SQL', () => {
  it('limits extras to the earliest of the ISO week via date_trunc(week) on both sides (Monday-based, same as isoWeekRange)', async () => {
    const { roster, em, group } = makeRoster({ presentRows: [] });
    await roster.resolveRoster(group);
    const sql = (em.query.mock.calls as [string][])
      .map((c) => c[0])
      .find((q) => q.includes('life_group_attendance_entries')) as string;
    expect(sql).toContain("date_trunc('week', x.meeting_date)");
    expect(sql).toContain("date_trunc('week', a.meeting_date)");
    expect(sql).toContain('ORDER BY x.meeting_date ASC');
    expect(sql).toContain('LIMIT 1');
  });

  // Equivalence lock: Postgres date_trunc('week') is ISO (Monday) so it groups
  // 2026-12-28..2027-01-03 together exactly like isoWeekRange does.
  it.each(['2026-12-28', '2026-12-31', '2027-01-01', '2027-01-03'])(
    'isoWeekRange puts %s in the week 2026-12-28..2027-01-03',
    (d) => {
      expect(isoWeekRange(d)).toEqual({
        start: '2026-12-28',
        end: '2027-01-03',
      });
    },
  );
  it('isoWeekRange splits 2027-01-03 and 2027-01-04', () => {
    expect(isoWeekRange('2027-01-04').start).toBe('2027-01-04');
  });
});

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
