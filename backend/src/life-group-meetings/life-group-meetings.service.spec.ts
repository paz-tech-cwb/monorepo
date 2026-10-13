/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest asymmetric matchers are typed any */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { FakeEntityManager } from './fake-entity-manager.testing';
import {
  LifeGroupMeetingsService,
  MeetingActor,
} from './life-group-meetings.service';
import { LifeGroupAttendanceService } from '../life-group-attendance/life-group-attendance.service';
import { LifeGroupReportSnapshotService } from '../life-group-reports/life-group-report-snapshot.service';
import { FormSubmissionAuditService } from '../forms-core/services/form-submission-audit.service';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { LifeGroupAttendance } from '../life-group-attendance/entities/life-group-attendance.entity';
import { LifeGroupAttendanceEntry } from '../life-group-attendance/entities/life-group-attendance-entry.entity';
import { LifeGroupReport } from '../life-group-reports/entities/life-group-report.entity';
import { User } from '../users/entities/user.entity';
import { UpsertLifeGroupMeetingDto } from './dto/upsert-life-group-meeting.dto';

// Wednesday 2026-10-14 12:00 Sao Paulo.
const NOW = new Date('2026-10-14T15:00:00Z');
const TODAY = '2026-10-14'; // Wednesday
const WED_14_AGO = '2026-09-30'; // deadline = 2026-10-14 (day 14)
const WED_21_AGO = '2026-09-23'; // deadline 2026-10-07 (closed)

const none: ResolvedScope = {
  unrestricted: false,
  areaIds: [],
  sectorIds: [],
  lifeGroupIds: [],
};
const unrestricted: ResolvedScope = { ...none, unrestricted: true };
const scopeOf = (...ids: number[]): ResolvedScope => ({
  ...none,
  lifeGroupIds: ids,
});

const leader: MeetingActor = { id: 101, isAdmin: false };
const coLeader: MeetingActor = { id: 102, isAdmin: false };
const admin: MeetingActor = { id: 109, isAdmin: true };

const report = {
  kids0To11: 2,
  guests: 1,
  mdas: 3,
  offering: '12.50',
  committedAtTadel: 4,
  committedAtCulto: 5,
  leaderAttended: ['tadel'],
  disciplesCount: 6,
  disciplesDiscipledThisWeek: 2,
  pastoringActivityType: ['visita'],
  pastoringActivityOther: null,
  trainingActivityType: [],
  trainingActivityOther: 'x',
};

const dto = (v: Partial<UpsertLifeGroupMeetingDto>) =>
  v as UpsertLifeGroupMeetingDto;
const attendanceBody = (
  entries: Array<[number, boolean]> = [
    [103, true],
    [104, false],
    [105, true],
  ],
) => ({
  entries: entries.map(([userId, present]) => ({ userId, present })),
});

function build() {
  const em = new FakeEntityManager();
  const names: Record<number, string> = {
    103: 'Ana',
    104: 'Bruno',
    105: 'Carla',
  };
  const users = Object.entries(names).map(([id, name]) =>
    Object.assign(new User(), { id: Number(id), name }),
  );
  em.seed(User, ...users);
  // Tables must exist so hydrate() can find constructors.
  em.rows(LifeGroupAttendanceEntry);
  em.rows(LifeGroupAttendance);
  em.rows(LifeGroupReport);

  const area = { id: 1 };
  const sector = { id: 1, area };
  const mk = (v: Partial<LifeGroup> & { id: number }) =>
    Object.assign(new LifeGroup(), {
      leader: { id: 101 },
      coLeader: null,
      users,
      sector,
      meetingDay: 'Quarta-feira',
      ...v,
    });
  em.seed(
    LifeGroup,
    mk({ id: 1, coLeader: { id: 102 } as User }),
    mk({ id: 2, sector: null, meetingDay: null }),
    mk({ id: 3, sector: { id: 2, area: null } as never }),
    mk({ id: 4, meetingDay: null }),
    mk({ id: 5, leader: { id: 108 } as User }),
  );

  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const snapshots = new LifeGroupReportSnapshotService(
    audit as unknown as FormSubmissionAuditService,
  );
  const attendance = new LifeGroupAttendanceService(
    em as unknown as EntityManager,
    audit as unknown as FormSubmissionAuditService,
    snapshots,
  );
  const service = new LifeGroupMeetingsService(
    em as unknown as EntityManager,
    attendance,
    audit as unknown as FormSubmissionAuditService,
  );
  return { em, audit, attendance, service };
}

describe('LifeGroupMeetingsService', () => {
  beforeEach(() => jest.useFakeTimers({ now: NOW }));
  afterEach(() => jest.useRealTimers());

  describe('authorization matrix (GET and PUT)', () => {
    const cases: Array<[string, ResolvedScope, MeetingActor, number, boolean]> =
      [
        ['leader (empty scope, leader_id fallback)', none, leader, 1, true],
        ['co-leader with member role', none, coLeader, 1, true],
        ['leader of two groups: group 1', scopeOf(1, 4), leader, 1, true],
        ['leader of two groups: group 4', scopeOf(1, 4), leader, 4, true],
        [
          'area supervisor in scope',
          scopeOf(1),
          { id: 106, isAdmin: false },
          1,
          true,
        ],
        [
          'sector supervisor in scope',
          scopeOf(1, 5),
          { id: 107, isAdmin: false },
          1,
          true,
        ],
        [
          'supervisor out of scope',
          scopeOf(5),
          { id: 107, isAdmin: false },
          1,
          false,
        ],
        [
          'plain member on the roster',
          none,
          { id: 103, isAdmin: false },
          1,
          false,
        ],
        ['outsider', none, { id: 111, isAdmin: false }, 1, false],
        ['other group leader', none, { id: 108, isAdmin: false }, 1, false],
        ['admin', unrestricted, admin, 1, true],
        [
          'pastor (unrestricted, not admin)',
          unrestricted,
          { id: 110, isAdmin: false },
          1,
          true,
        ],
      ];

    it.each(cases)('%s', async (_name, scope, actor, groupId, allowed) => {
      const { service } = build();
      const get = service.getMeeting(groupId, TODAY, scope, actor);
      const put = build().service.upsertMeeting(
        groupId,
        TODAY,
        dto({ attendance: attendanceBody() as never }),
        scope,
        actor,
      );
      if (allowed) {
        await expect(get).resolves.toBeDefined();
        await expect(put).resolves.toBeDefined();
      } else {
        await expect(get).rejects.toThrow(ForbiddenException);
        await expect(put).rejects.toThrow(ForbiddenException);
      }
    });

    it('404 for an unknown group', async () => {
      await expect(
        build().service.getMeeting(99, TODAY, unrestricted, admin),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('edit window', () => {
    const put = (
      date: string,
      actor: MeetingActor,
      scope: ResolvedScope = none,
      body: Partial<UpsertLifeGroupMeetingDto> = {
        attendance: attendanceBody() as never,
      },
    ) => build().service.upsertMeeting(1, date, dto(body), scope, actor);

    it('allows day 14 and denies day 15 for leader, co-leader and supervisor', async () => {
      const supervisor: MeetingActor = { id: 106, isAdmin: false };
      jest.setSystemTime(new Date('2026-10-15T02:59:00Z')); // Oct 14 23:59 SP
      await expect(put(WED_14_AGO, leader)).resolves.toBeDefined();
      await expect(put(WED_14_AGO, coLeader)).resolves.toBeDefined();
      await expect(
        put(WED_14_AGO, supervisor, scopeOf(1)),
      ).resolves.toBeDefined();

      jest.setSystemTime(new Date('2026-10-15T03:00:00Z')); // Oct 15 00:00 SP
      for (const [actor, scope] of [
        [leader, none],
        [coLeader, none],
        [supervisor, scopeOf(1)],
      ] as Array<[MeetingActor, ResolvedScope]>) {
        await expect(put(WED_14_AGO, actor, scope)).rejects.toMatchObject({
          response: expect.objectContaining({ code: 'edit_window_closed' }),
        });
      }
    });

    it('denies past the window for pastor (only admin bypasses)', async () => {
      await expect(
        put(WED_21_AGO, { id: 110, isAdmin: false }, unrestricted),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lets admin create and edit forever, both pieces', async () => {
      jest.setSystemTime(new Date('2027-03-01T12:00:00Z'));
      const { service } = build();
      const body = dto({
        attendance: attendanceBody() as never,
        report: report as never,
      });
      const first = await service.upsertMeeting(
        1,
        WED_21_AGO,
        body,
        unrestricted,
        admin,
      );
      expect(first.report).not.toBeNull();
      await expect(
        service.upsertMeeting(1, WED_21_AGO, body, unrestricted, admin),
      ).resolves.toBeDefined();
    });

    it('applies to the report half too', async () => {
      const { service } = build();
      await service.upsertMeeting(
        1,
        WED_21_AGO,
        dto({ attendance: attendanceBody() as never }),
        unrestricted,
        admin,
      );
      await expect(
        service.upsertMeeting(
          1,
          WED_21_AGO,
          dto({ report: report as never }),
          none,
          leader,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('reads are always allowed and report can_edit/edit_deadline', async () => {
      const { service } = build();
      const old = await service.getMeeting(1, WED_21_AGO, none, leader);
      expect(old.can_edit).toBe(false);
      expect(old.edit_deadline).toBe('2026-10-07');
      const asAdmin = await service.getMeeting(
        1,
        WED_21_AGO,
        unrestricted,
        admin,
      );
      expect(asAdmin.can_edit).toBe(true);
      const current = await service.getMeeting(1, TODAY, none, leader);
      expect(current.can_edit).toBe(true);
      expect(current.edit_deadline).toBe('2026-10-28');
    });
  });

  describe('GET', () => {
    it('returns a draft from the current roster, all present, with decision Q3 flags', async () => {
      const { service } = build();
      const view = await service.getMeeting(1, TODAY, none, leader);
      expect(view.attendance).toMatchObject({
        id: null,
        is_draft: true,
        default_present: true,
        members_count: 3,
        present_count: 3,
      });
      expect(
        (view.attendance!.entries as unknown[]).map(
          (e) => (e as { name: string }).name,
        ),
      ).toEqual(['Ana', 'Bruno', 'Carla']);
      expect(view.report).toBeNull();
      expect(view.derived).toEqual({
        committed_members: 3,
        committed_members_present: 3,
      });
      expect(view.report_blocked_reason).toBeNull();
    });

    it('returns the saved combined record', async () => {
      const { service } = build();
      await service.upsertMeeting(
        1,
        TODAY,
        dto({ attendance: attendanceBody() as never, report: report as never }),
        none,
        leader,
      );
      const view = await service.getMeeting(1, TODAY, none, coLeader);
      expect(view.attendance).toMatchObject({
        is_draft: false,
        default_present: null,
        members_count: 3,
        present_count: 2,
      });
      expect(view.report).toMatchObject({
        life_group_id: 1,
        date: TODAY,
        area_id: 1,
        sector_id: 1,
        committed_members: 3,
        committed_members_present: 2,
        offering: '12.50',
      });
      expect(view.derived).toEqual({
        committed_members: 3,
        committed_members_present: 2,
      });
    });

    it('rejects a weekday mismatch like attendance does, but keeps a legacy report readable', async () => {
      const { service, em } = build();
      await expect(
        service.getMeeting(1, '2026-10-13', none, leader),
      ).rejects.toThrow(BadRequestException);
      em.seed(
        LifeGroupReport,
        Object.assign(new LifeGroupReport(), {
          id: 'legacy',
          date: '2026-10-13',
          lifeGroupId: 1,
          deletedAt: null,
          createdAt: new Date(1),
          submittedBy: { id: 1, name: 'x' },
        }),
      );
      const view = await service.getMeeting(1, '2026-10-13', none, leader);
      expect(view.attendance).toBeNull();
      expect(view.report?.id).toBe('legacy');
    });

    it('rejects bad and future dates', async () => {
      const { service } = build();
      await expect(
        service.getMeeting(1, '2026-13-40', none, leader),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.getMeeting(1, '2026-10-21', none, leader),
      ).rejects.toThrow(BadRequestException);
    });

    it('flags groups whose report cannot be attributed', async () => {
      const { service } = build();
      expect(
        (await service.getMeeting(2, TODAY, none, leader))
          .report_blocked_reason,
      ).toBe('group_has_no_sector');
      expect(
        (await service.getMeeting(3, TODAY, none, leader))
          .report_blocked_reason,
      ).toBe('sector_has_no_area');
    });
  });

  describe('PUT', () => {
    it('rejects an empty body and treats null parts as absent', async () => {
      const { service } = build();
      await expect(
        service.upsertMeeting(1, TODAY, dto({}), none, leader),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.upsertMeeting(
          1,
          TODAY,
          dto({ attendance: null, report: null }),
          none,
          leader,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('409 attendance_required when the report arrives without any attendance', async () => {
      const { service, em } = build();
      await expect(
        service.upsertMeeting(
          1,
          TODAY,
          dto({ report: report as never }),
          none,
          leader,
        ),
      ).rejects.toMatchObject({
        status: 409,
        response: expect.objectContaining({ code: 'attendance_required' }),
      });
      expect(em.rows(LifeGroupReport)).toHaveLength(0);
    });

    it('accepts a report in a later PUT once attendance exists', async () => {
      const { service, em } = build();
      await service.upsertMeeting(
        1,
        TODAY,
        dto({ attendance: attendanceBody() as never }),
        none,
        leader,
      );
      const view = await service.upsertMeeting(
        1,
        TODAY,
        dto({ report: report as never }),
        none,
        coLeader,
      );
      expect(view.report).toMatchObject({
        committed_members: 3,
        committed_members_present: 2,
        submitted_by: { id: 102, name: undefined },
      });
      expect(em.rows(LifeGroupReport)[0]).toMatchObject({
        attendanceId: em.rows(LifeGroupAttendance)[0].id,
      });
    });

    it('derives area/sector and committed_* server side and links the attendance', async () => {
      const { service, em } = build();
      await service.upsertMeeting(
        1,
        TODAY,
        dto({ attendance: attendanceBody() as never, report: report as never }),
        none,
        leader,
      );
      const row = em.rows(LifeGroupReport)[0];
      expect(row).toMatchObject({
        areaId: 1,
        sectorId: 1,
        lifeGroupId: 1,
        date: TODAY,
        committedMembers: 3,
        committedMembersPresent: 2,
        attendanceId: em.rows(LifeGroupAttendance)[0].id,
        submittedBy: { id: 101 },
      });
    });

    it('422 when the group has no sector or the sector has no area, and writes nothing', async () => {
      const { service, em } = build();
      for (const id of [2, 3]) {
        await expect(
          service.upsertMeeting(
            id,
            TODAY,
            dto({
              attendance: attendanceBody() as never,
              report: report as never,
            }),
            none,
            leader,
          ),
        ).rejects.toThrow(UnprocessableEntityException);
      }
      expect(em.rows(LifeGroupAttendance)).toHaveLength(0);
      // attendance alone is still fine for those groups
      await expect(
        service.upsertMeeting(
          2,
          TODAY,
          dto({ attendance: attendanceBody() as never }),
          none,
          leader,
        ),
      ).resolves.toBeDefined();
    });

    it('is idempotent by (group, date): same body twice leaves one row of each', async () => {
      const { service, em } = build();
      const body = dto({
        attendance: attendanceBody() as never,
        report: report as never,
      });
      const a = await service.upsertMeeting(1, TODAY, body, none, leader);
      const b = await service.upsertMeeting(1, TODAY, body, none, leader);
      expect(em.rows(LifeGroupAttendance)).toHaveLength(1);
      expect(em.rows(LifeGroupReport)).toHaveLength(1);
      expect(em.rows(LifeGroupAttendanceEntry)).toHaveLength(3);
      expect(b.report?.id).toBe(a.report?.id);
      expect(b.attendance?.id).toBe(a.attendance?.id);
    });

    it('keeps the original submitter when another actor edits, and audits both slugs', async () => {
      const { service, em, audit } = build();
      const body = dto({
        attendance: attendanceBody() as never,
        report: report as never,
      });
      await service.upsertMeeting(1, TODAY, body, none, leader);
      await service.upsertMeeting(1, TODAY, body, none, coLeader);
      expect(em.rows(LifeGroupReport)[0].submittedBy).toEqual({ id: 101 });
      const calls = audit.record.mock.calls.map(
        ([p, manager]: [Record<string, unknown>, unknown]) => [
          p.formSlug,
          p.action,
          p.actorId,
          manager === em,
        ],
      );
      expect(calls).toEqual([
        ['life_group_attendance', 'create', 101, true],
        ['life-group-reports', 'create', 101, true],
        ['life_group_attendance', 'update', 102, true],
        ['life-group-reports', 'update', 102, true],
      ]);
    });

    it('validates roster, duplicates, weekday and future dates like attendance', async () => {
      const { service } = build();
      await expect(
        service.upsertMeeting(
          1,
          TODAY,
          dto({
            attendance: attendanceBody([
              [103, true],
              [999, true],
            ]) as never,
          }),
          none,
          leader,
        ),
      ).rejects.toThrow(/Unknown user_id/);
      await expect(
        service.upsertMeeting(
          1,
          TODAY,
          dto({
            attendance: attendanceBody([
              [103, true],
              [103, false],
            ]) as never,
          }),
          none,
          leader,
        ),
      ).rejects.toThrow(/Duplicate user_id/);
      await expect(
        service.upsertMeeting(
          1,
          '2026-10-13',
          dto({ attendance: attendanceBody() as never }),
          none,
          leader,
        ),
      ).rejects.toThrow(/is not a Quarta-feira/);
      await expect(
        service.upsertMeeting(
          1,
          '2026-10-21',
          dto({ attendance: attendanceBody() as never }),
          none,
          leader,
        ),
      ).rejects.toThrow(/future/);
    });

    it('groups without a fixed meeting day accept any past date (same as attendance)', async () => {
      const { service } = build();
      await expect(
        service.upsertMeeting(
          4,
          '2026-10-13',
          dto({ attendance: attendanceBody() as never }),
          none,
          leader,
        ),
      ).resolves.toBeDefined();
    });

    it('takes the per-(group,date) advisory lock before any read', async () => {
      const { service, em } = build();
      await service.upsertMeeting(
        1,
        TODAY,
        dto({ attendance: attendanceBody() as never }),
        none,
        leader,
      );
      expect(em.queries).toHaveLength(1);
      expect(em.queries[0].sql).toMatch(/pg_advisory_xact_lock/);
      expect(em.queries[0].params).toEqual([4207, '1:2026-10-14']);
      const lockOrder = em.query.mock.invocationCallOrder[0];
      // findOne #1 is the pre-transaction access load; the in-lock reload and
      // attendance lookup must come after the lock.
      const afterLock = em.findOne.mock.invocationCallOrder.filter(
        (o) => o > lockOrder,
      );
      expect(afterLock.length).toBeGreaterThanOrEqual(2);
    });

    it('updates only presence on re-save and keeps the roster snapshot', async () => {
      const { service, em } = build();
      await service.upsertMeeting(
        1,
        TODAY,
        dto({ attendance: attendanceBody() as never }),
        none,
        leader,
      );
      const view = await service.upsertMeeting(
        1,
        TODAY,
        dto({
          attendance: attendanceBody([
            [103, false],
            [104, false],
            [105, false],
            [999, true],
          ]) as never,
        }),
        none,
        leader,
      );
      expect(view.attendance).toMatchObject({
        members_count: 3,
        present_count: 0,
      });
      expect(em.rows(LifeGroupAttendanceEntry)).toHaveLength(3);
    });
  });

  describe('report snapshot re-sync', () => {
    async function withCombined() {
      const ctx = build();
      await ctx.service.upsertMeeting(
        1,
        TODAY,
        dto({ attendance: attendanceBody() as never, report: report as never }),
        none,
        leader,
      );
      return ctx;
    }

    it('re-syncs committed_* when attendance is edited through the meetings endpoint', async () => {
      const { service, em } = await withCombined();
      await service.upsertMeeting(
        1,
        TODAY,
        dto({
          attendance: attendanceBody([
            [103, true],
            [104, true],
            [105, true],
          ]) as never,
        }),
        none,
        leader,
      );
      expect(em.rows(LifeGroupReport)[0]).toMatchObject({
        committedMembers: 3,
        committedMembersPresent: 3,
      });
    });

    it('re-syncs through the OLD attendance PUT (old app versions)', async () => {
      const { attendance, em, audit } = await withCombined();
      audit.record.mockClear();
      await attendance.upsert(
        1,
        TODAY,
        {
          entries: [
            { userId: 103, present: false },
            { userId: 104, present: false },
            { userId: 105, present: false },
          ],
        },
        none,
        { id: 101 },
      );
      expect(em.rows(LifeGroupReport)[0]).toMatchObject({
        committedMembers: 3,
        committedMembersPresent: 0,
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          formSlug: 'life-group-reports',
          action: 'update',
          diff: expect.objectContaining({ committed_members_present: 0 }),
        }),
        em,
      );
    });

    it('does not touch an unlinked legacy report or a soft-deleted linked one', async () => {
      const { attendance, em } = build();
      const mkReport = (v: Record<string, unknown>) =>
        Object.assign(new LifeGroupReport(), {
          date: TODAY,
          lifeGroupId: 1,
          committedMembers: 9,
          committedMembersPresent: 9,
          createdAt: new Date(1),
          deletedAt: null,
          attendanceId: null,
          ...v,
        });
      em.seed(LifeGroupReport, mkReport({ id: 'legacy' }));
      await attendance.upsert(
        1,
        TODAY,
        {
          entries: [
            { userId: 103, present: true },
            { userId: 104, present: true },
            { userId: 105, present: true },
          ],
        },
        none,
        { id: 101 },
      );
      const attId = em.rows(LifeGroupAttendance)[0].id;
      em.seed(
        LifeGroupReport,
        mkReport({ id: 'gone', attendanceId: attId, deletedAt: new Date() }),
      );
      await attendance.upsert(
        1,
        TODAY,
        {
          entries: [
            { userId: 103, present: false },
            { userId: 104, present: false },
            { userId: 105, present: false },
          ],
        },
        none,
        { id: 101 },
      );
      const rows = em.rows(LifeGroupReport);
      expect(rows.find((r) => r.id === 'legacy')).toMatchObject({
        committedMembers: 9,
        committedMembersPresent: 9,
        attendanceId: null,
      });
      expect(rows.find((r) => r.id === 'gone')).toMatchObject({
        committedMembersPresent: 9,
      });
    });

    it('a meetings PUT with a report links and overwrites a legacy report of the same date', async () => {
      const { service, em } = build();
      em.seed(
        LifeGroupReport,
        Object.assign(new LifeGroupReport(), {
          id: 'legacy',
          date: TODAY,
          lifeGroupId: 1,
          committedMembers: 9,
          committedMembersPresent: 9,
          createdAt: new Date(1),
          deletedAt: null,
          attendanceId: null,
          submittedBy: { id: 7, name: 'old' },
        }),
      );
      const view = await service.upsertMeeting(
        1,
        TODAY,
        dto({ attendance: attendanceBody() as never, report: report as never }),
        none,
        leader,
      );
      expect(em.rows(LifeGroupReport)).toHaveLength(1);
      expect(view.report).toMatchObject({
        id: 'legacy',
        committed_members: 3,
        committed_members_present: 2,
      });
    });
  });

  describe('failure handling', () => {
    it('rolls the attendance back when the report write fails', async () => {
      const { service, em } = build();
      em.failOnSave = (entity) =>
        entity === LifeGroupReport ? new Error('boom') : undefined;
      await expect(
        service.upsertMeeting(
          1,
          TODAY,
          dto({
            attendance: attendanceBody() as never,
            report: report as never,
          }),
          none,
          leader,
        ),
      ).rejects.toThrow('boom');
      expect(em.rows(LifeGroupAttendance)).toHaveLength(0);
      expect(em.rows(LifeGroupAttendanceEntry)).toHaveLength(0);
      expect(em.rows(LifeGroupReport)).toHaveLength(0);
    });

    it('rolls back when the report audit insert fails', async () => {
      const { service, em, audit } = build();
      audit.record.mockImplementation(({ formSlug }: { formSlug: string }) =>
        formSlug === 'life-group-reports'
          ? Promise.reject(new Error('audit down'))
          : Promise.resolve(),
      );
      await expect(
        service.upsertMeeting(
          1,
          TODAY,
          dto({
            attendance: attendanceBody() as never,
            report: report as never,
          }),
          none,
          leader,
        ),
      ).rejects.toThrow('audit down');
      expect(em.rows(LifeGroupAttendance)).toHaveLength(0);
      expect(em.rows(LifeGroupReport)).toHaveLength(0);
    });

    it('replays once on a unique violation raised by a concurrent legacy writer, then 409', async () => {
      const { service, em } = build();
      let calls = 0;
      em.failOnSave = (entity) =>
        entity === LifeGroupAttendance && ++calls === 1
          ? Object.assign(new Error('dup'), { code: '23505' })
          : undefined;
      await expect(
        service.upsertMeeting(
          1,
          TODAY,
          dto({ attendance: attendanceBody() as never }),
          none,
          leader,
        ),
      ).resolves.toBeDefined();
      expect(em.rows(LifeGroupAttendance)).toHaveLength(1);

      const second = build();
      second.em.failOnSave = (entity) =>
        entity === LifeGroupAttendance
          ? Object.assign(new Error('dup'), { code: '23505' })
          : undefined;
      await expect(
        second.service.upsertMeeting(
          1,
          TODAY,
          dto({ attendance: attendanceBody() as never }),
          none,
          leader,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });
});
