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
const pastor: MeetingActor = { id: 110, isAdmin: false, isPastor: true };

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
    // [name, scope, actor, group, canRead, canWrite]
    const cases: Array<
      [string, ResolvedScope, MeetingActor, number, boolean, boolean]
    > = [
      ['leader (empty scope, leader_id fallback)', none, leader, 1, true, true],
      ['co-leader with member role', none, coLeader, 1, true, true],
      ['leader of two groups: group 1', scopeOf(1, 4), leader, 1, true, true],
      ['leader of two groups: group 4', scopeOf(1, 4), leader, 4, true, true],
      [
        'area supervisor in scope (read-only)',
        scopeOf(1),
        { id: 106, isAdmin: false },
        1,
        true,
        false,
      ],
      [
        'sector supervisor in scope (read-only)',
        scopeOf(1, 5),
        { id: 107, isAdmin: false },
        1,
        true,
        false,
      ],
      [
        'leader of ANOTHER group who supervises this one via scope (read-only)',
        scopeOf(1, 4),
        { id: 108, isAdmin: false },
        1,
        true,
        false,
      ],
      [
        'supervisor out of scope',
        scopeOf(5),
        { id: 107, isAdmin: false },
        1,
        false,
        false,
      ],
      [
        'plain member on the roster',
        none,
        { id: 103, isAdmin: false },
        1,
        false,
        false,
      ],
      ['outsider', none, { id: 111, isAdmin: false }, 1, false, false],
      [
        'other group leader',
        none,
        { id: 108, isAdmin: false },
        1,
        false,
        false,
      ],
      ['admin', unrestricted, admin, 1, true, true],
      ['pastor', unrestricted, pastor, 1, true, true],
    ];

    it.each(cases)(
      '%s',
      async (_name, scope, actor, groupId, canRead, canWrite) => {
        const { service } = build();
        const get = service.getMeeting(groupId, TODAY, scope, actor);
        const put = build().service.upsertMeeting(
          groupId,
          TODAY,
          dto({ attendance: attendanceBody() as never }),
          scope,
          actor,
        );
        if (canRead) {
          const view = await get;
          expect(view.can_write).toBe(canWrite);
          expect(view.can_edit).toBe(canWrite);
          expect(view.edit_deadline).toBeDefined();
        } else {
          await expect(get).rejects.toThrow(ForbiddenException);
        }
        if (canWrite) {
          await expect(put).resolves.toBeDefined();
        } else {
          await expect(put).rejects.toThrow(ForbiddenException);
          if (canRead) {
            await expect(put).rejects.toMatchObject({
              response: expect.objectContaining({
                code: 'meeting_write_forbidden',
              }),
            });
          }
        }
      },
    );

    it('404 for an unknown group, with the stable group_not_found code', async () => {
      const call = build().service.getMeeting(99, TODAY, unrestricted, admin);
      await expect(call).rejects.toThrow(NotFoundException);
      await expect(call).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'group_not_found' }),
      });
    });

    it('403 carries life_group_access_forbidden', async () => {
      await expect(
        build().service.getMeeting(5, TODAY, none, leader),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'life_group_access_forbidden',
        }),
      });
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

    it('allows day 14 and denies day 15 for leader, co-leader and pastor', async () => {
      jest.setSystemTime(new Date('2026-10-15T02:59:00Z')); // Oct 14 23:59 SP
      await expect(put(WED_14_AGO, leader)).resolves.toBeDefined();
      await expect(put(WED_14_AGO, coLeader)).resolves.toBeDefined();
      await expect(
        put(WED_14_AGO, pastor, unrestricted),
      ).resolves.toBeDefined();

      jest.setSystemTime(new Date('2026-10-15T03:00:00Z')); // Oct 15 00:00 SP
      for (const [actor, scope] of [
        [leader, none],
        [coLeader, none],
        [pastor, unrestricted],
      ] as Array<[MeetingActor, ResolvedScope]>) {
        await expect(put(WED_14_AGO, actor, scope)).rejects.toMatchObject({
          response: expect.objectContaining({ code: 'edit_window_closed' }),
        });
      }
    });

    it('denies past the window for pastor (only admin bypasses)', async () => {
      await expect(put(WED_21_AGO, pastor, unrestricted)).rejects.toThrow(
        ForbiddenException,
      );
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

    it('past date outside the edit window with no record is a read-only draft of the CURRENT roster', async () => {
      const { service } = build();
      // Group 4 has no fixed day (any date is regular); group 1 meets Wednesdays.
      for (const [group, date] of [
        [4, '2026-09-08'],
        [1, '2026-09-09'],
      ] as const) {
        const view = await service.getMeeting(group, date, none, leader);
        expect(view.can_write).toBe(true);
        expect(view.can_edit).toBe(false);
        expect(view.edit_deadline < TODAY).toBe(true);
        expect(view.attendance).toMatchObject({
          is_draft: true,
          id: null,
          members_count: 3,
        });
        expect(view.report).toBeNull();
      }
    });

    it('rejects bad and future dates with stable codes', async () => {
      const { service } = build();
      for (const [date, code] of [
        ['2026-13-40', 'invalid_meeting_date'],
        ['2026-10-21', 'date_in_future'],
        ['nope', 'invalid_meeting_date_format'],
      ] as const) {
        await expect(
          service.getMeeting(1, date, none, leader),
        ).rejects.toMatchObject({
          response: expect.objectContaining({ code }),
        });
      }
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

  describe('extra meetings (extra_meeting flag)', () => {
    const TUE = '2026-10-13';
    const put = (
      service: LifeGroupMeetingsService,
      date: string,
      body: Partial<UpsertLifeGroupMeetingDto>,
      groupId = 1,
      actor: MeetingActor = leader,
    ) =>
      service.upsertMeeting(
        groupId,
        date,
        dto(body),
        actor.isAdmin ? unrestricted : none,
        actor,
      );
    const att = () => attendanceBody() as never;
    const rowsOf = (em: FakeEntityManager) => em.rows(LifeGroupAttendance);

    it('rejects a non-fixed weekday without the flag (message and code mention it)', async () => {
      const { service, em } = build();
      for (const body of [{}, { extraMeeting: false }]) {
        await expect(
          put(service, TUE, { attendance: att(), ...body }),
        ).rejects.toMatchObject({
          response: {
            code: 'extra_meeting_required',
            message: expect.stringContaining('extra_meeting: true'),
          },
        });
      }
      expect(rowsOf(em)).toHaveLength(0);
    });

    it('accepts a non-fixed weekday with the flag, stores is_extra and exposes it', async () => {
      const { service, em } = build();
      const view = await put(service, TUE, {
        attendance: att(),
        extraMeeting: true,
      });
      expect(view.attendance).toMatchObject({
        is_extra: true,
        is_draft: false,
        members_count: 3,
        present_count: 2,
      });
      expect(rowsOf(em)[0]).toMatchObject({ isExtra: true });
      // Roster snapshot is kept: entries are the submitted roster.
      expect(em.rows(LifeGroupAttendanceEntry)).toHaveLength(3);
      const again = await service.getMeeting(1, TUE, none, leader);
      expect(again.attendance).toMatchObject({ is_extra: true });
    });

    it('a regular weekday stays is_extra=false (flag omitted or false)', async () => {
      const { service } = build();
      const view = await put(service, TODAY, { attendance: att() });
      expect(view.attendance).toMatchObject({ is_extra: false });
      const view2 = await put(service, '2026-10-07', {
        attendance: att(),
        extraMeeting: false,
      });
      expect(view2.attendance).toMatchObject({ is_extra: false });
    });

    it('rejects the flag on the regular weekday and on a group without a fixed day', async () => {
      const { service, em } = build();
      await expect(
        put(service, TODAY, { attendance: att(), extraMeeting: true }),
      ).rejects.toMatchObject({
        response: { code: 'extra_meeting_on_regular_day' },
      });
      await expect(
        put(service, TUE, { attendance: att(), extraMeeting: true }, 4),
      ).rejects.toMatchObject({
        response: { code: 'extra_meeting_not_applicable' },
      });
      expect(rowsOf(em)).toHaveLength(0);
    });

    it('a group without a fixed day still accepts any date without the flag', async () => {
      const { service } = build();
      const view = await put(service, TUE, { attendance: att() }, 4);
      expect(view.attendance).toMatchObject({ is_extra: false });
    });

    it('is immutable on an existing record: omitted keeps it, contradicting is rejected', async () => {
      const { service, em } = build();
      await put(service, TUE, { attendance: att(), extraMeeting: true });
      // omitted: edit works and stays extra
      const kept = await put(service, TUE, {
        attendance: attendanceBody([
          [103, false],
          [104, false],
          [105, false],
        ]) as never,
      });
      expect(kept.attendance).toMatchObject({
        is_extra: true,
        present_count: 0,
      });
      // same value: fine
      await put(service, TUE, { attendance: att(), extraMeeting: true });
      // flip extra -> regular
      await expect(
        put(service, TUE, { attendance: att(), extraMeeting: false }),
      ).rejects.toMatchObject({
        response: { code: 'extra_meeting_immutable' },
      });
      // flip regular -> extra
      await put(service, TODAY, { attendance: att() });
      await expect(
        put(service, TODAY, { attendance: att(), extraMeeting: true }),
      ).rejects.toMatchObject({
        response: { code: 'extra_meeting_immutable' },
      });
      expect(
        rowsOf(em)
          .map((r): [string, boolean] => [
            r.meetingDate as string,
            r.isExtra as boolean,
          ])
          .sort(),
      ).toEqual([
        [TUE, true],
        [TODAY, false],
      ]);
    });

    it('a report-only PUT ignores the flag (attendance must already exist)', async () => {
      const { service } = build();
      await put(service, TUE, { attendance: att(), extraMeeting: true });
      const view = await put(service, TUE, {
        report: report as never,
        extraMeeting: true,
      });
      expect(view.report).not.toBeNull();
      expect(view.attendance).toMatchObject({ is_extra: true });
      await expect(
        put(service, '2026-10-12', {
          report: report as never,
          extraMeeting: true,
        }),
      ).rejects.toMatchObject({ response: { code: 'attendance_required' } });
    });

    it('attendance + report in one PUT on an extra date', async () => {
      const { service } = build();
      const view = await put(service, TUE, {
        attendance: att(),
        report: report as never,
        extraMeeting: true,
      });
      expect(view.attendance).toMatchObject({ is_extra: true });
      expect(view.derived).toEqual({
        committed_members: 3,
        committed_members_present: 2,
      });
    });

    it('caps extra meetings at 3 per group per ISO week; other week and other group unaffected', async () => {
      const { service, em } = build();
      // Week Mon 2026-10-05 .. Sun 2026-10-11 (Wed 10-07 is the regular day).
      for (const d of ['2026-10-05', '2026-10-06', '2026-10-08']) {
        await put(service, d, { attendance: att(), extraMeeting: true });
      }
      await expect(
        put(service, '2026-10-09', { attendance: att(), extraMeeting: true }),
      ).rejects.toMatchObject({
        status: 409,
        response: { code: 'extra_meeting_limit_reached' },
      });
      expect(rowsOf(em)).toHaveLength(3);
      // Editing an existing extra of that full week is still fine.
      await put(service, '2026-10-06', { attendance: att() });
      // A regular meeting in that week is not blocked and does not count.
      await put(service, '2026-10-07', { attendance: att() });
      // Next ISO week (Mon 10-12): counted separately.
      await put(service, '2026-10-12', {
        attendance: att(),
        extraMeeting: true,
      });
      // Another group (no weekday constraint issue: group 5 meets Wednesday).
      await service.upsertMeeting(
        5,
        '2026-10-09',
        dto({ attendance: att(), extraMeeting: true }),
        scopeOf(5),
        { id: 108, isAdmin: false },
      );
      // Admin is bound by the cap too.
      await expect(
        put(
          service,
          '2026-10-10',
          { attendance: att(), extraMeeting: true },
          1,
          admin,
        ),
      ).rejects.toMatchObject({
        response: { code: 'extra_meeting_limit_reached' },
      });
    });

    it('year boundary: the ISO week Mon 2026-12-28 .. Sun 2027-01-03 is ONE cap week', async () => {
      jest.setSystemTime(new Date('2027-01-10T12:00:00Z'));
      const { service, em } = build();
      // Wed 2026-12-30 is the regular day; these are all extras in one ISO week.
      for (const d of ['2026-12-28', '2026-12-29', '2027-01-01']) {
        await put(service, d, { attendance: att(), extraMeeting: true });
      }
      await expect(
        put(service, '2027-01-03', { attendance: att(), extraMeeting: true }),
      ).rejects.toMatchObject({
        status: 409,
        response: { code: 'extra_meeting_limit_reached' },
      });
      // Mon 2027-01-04 starts the next ISO week.
      await put(service, '2027-01-04', {
        attendance: att(),
        extraMeeting: true,
      });
      expect(rowsOf(em)).toHaveLength(4);
      const weekLocks = em.queries
        .filter((q) => q.sql.includes('pg_advisory_xact_lock'))
        .map((q) => q.params)
        .filter((p) => p?.[0] === 4208)
        .map((p) => p?.[1]);
      // Both December and January dates lock the same Monday key.
      expect(weekLocks.slice(0, 4)).toEqual(Array(4).fill('1:2026-12-28'));
      expect(weekLocks[weekLocks.length - 1]).toBe('1:2027-01-04');
    });

    // Known behavior (review m2): the draft preview does not check the cap.
    // Known behavior (review m3): eligibility counts the EARLIEST-DATED extra
    // of a week, so back-filling an earlier-dated extra later moves the
    // counted one (documented in .ai/features/life-groups.md).

    it('takes the (group, week) advisory lock before counting', async () => {
      const { service, em } = build();
      await put(service, TUE, { attendance: att(), extraMeeting: true });
      const lockCalls = em.queries
        .filter((q) => q.sql.includes('pg_advisory_xact_lock'))
        .map((q) => q.params);
      expect(lockCalls).toEqual([
        [4207, `1:${TUE}`],
        [4208, '1:2026-10-12'],
      ]);
    });

    it('still enforces the edit window and future dates for extras', async () => {
      const { service } = build();
      // Tuesday 2026-09-22 is 22 days ago: window closed for a leader.
      await expect(
        put(service, '2026-09-22', { attendance: att(), extraMeeting: true }),
      ).rejects.toThrow(ForbiddenException);
      // ... but an admin may.
      await put(
        service,
        '2026-09-22',
        { attendance: att(), extraMeeting: true },
        1,
        admin,
      );
      await expect(
        put(service, '2026-10-20', { attendance: att(), extraMeeting: true }),
      ).rejects.toThrow(/future/);
    });

    it('keeps the access rules for extras', async () => {
      const { service } = build();
      await expect(
        service.upsertMeeting(
          1,
          TUE,
          dto({ attendance: att(), extraMeeting: true }),
          none,
          { id: 111, isAdmin: false },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rolls back when the extra attendance fails later (roster check)', async () => {
      const { service, em } = build();
      await expect(
        put(service, TUE, {
          attendance: attendanceBody([[999, true]]) as never,
          extraMeeting: true,
        }),
      ).rejects.toThrow(/Unknown user_id/);
      expect(rowsOf(em)).toHaveLength(0);
    });

    describe('GET draft', () => {
      it('is rejected on a non-fixed weekday without the flag, mentioning it', async () => {
        const { service } = build();
        await expect(
          service.getMeeting(1, TUE, none, leader),
        ).rejects.toMatchObject({
          response: { code: 'extra_meeting_required' },
        });
      });

      it('previews an extra draft with extra_meeting=true', async () => {
        const { service } = build();
        const view = await service.getMeeting(1, TUE, none, leader, true);
        expect(view.attendance).toMatchObject({
          is_draft: true,
          is_extra: true,
          default_present: true,
          members_count: 3,
        });
      });

      it('regular drafts report is_extra=false; flag on a regular day is 400', async () => {
        const { service } = build();
        expect(
          (await service.getMeeting(1, TODAY, none, leader)).attendance,
        ).toMatchObject({ is_extra: false });
        await expect(
          service.getMeeting(1, TODAY, none, leader, true),
        ).rejects.toMatchObject({
          response: { code: 'extra_meeting_on_regular_day' },
        });
      });

      it('a saved extra record is returned regardless of the query flag', async () => {
        const { service } = build();
        await put(service, TUE, { attendance: att(), extraMeeting: true });
        for (const flag of [undefined, true]) {
          const view = await service.getMeeting(1, TUE, none, leader, flag);
          expect(view.attendance).toMatchObject({
            is_extra: true,
            is_draft: false,
          });
        }
      });
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
