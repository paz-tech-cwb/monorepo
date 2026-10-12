import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In, MoreThanOrEqual } from 'typeorm';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { ResolvedScope } from '../forms-core/services/scope-resolver.service';
import {
  WEEKDAY_INDEX,
  dateKeyOf,
  nextMeetingDate,
  shiftDays,
  weekdayOfDateString,
  zonedParts,
} from '../life-group-attendance/meeting-day.util';
import {
  assertCanAccessLifeGroup,
  assertValidDateString,
  findLifeGroupOrThrow,
  TaskActor,
} from './life-group-task-access';
import {
  LifeGroupTaskNotice,
  LifeGroupTaskNotifier,
  LifeGroupTaskReassignReason,
} from './life-group-task-notifier';
import {
  LifeGroupRoster,
  LifeGroupTaskRosterService,
} from './life-group-task-roster.service';
import { assignTasks } from './assignment-engine';
import { LifeGroupTaskAssignment } from './entities/life-group-task-assignment.entity';
import { LifeGroupTaskOverride } from './entities/life-group-task-override.entity';
import { LifeGroupTaskSkip } from './entities/life-group-task-skip.entity';
import { LifeGroupTaskTemplate } from './entities/life-group-task-template.entity';

// Window accepted by the manual generate endpoint.
const MAX_DAYS_BACK = 7;
const MAX_DAYS_AHEAD = 60;

interface EnabledTemplate {
  template: LifeGroupTaskTemplate;
  // Guidance with the group's override already applied.
  guidance: string;
}

interface HistoryRow {
  user_id: number | string;
  template_id: number | string;
  n: number | string;
}

export interface GenerationResult {
  meetingDate: string;
  skipped: boolean;
  // All assignments for the meeting after generation (sorted by template).
  assignments: LifeGroupTaskAssignment[];
  // Subset of `assignments` created by this call.
  created: LifeGroupTaskAssignment[];
  // Enabled templates for which no eligible member exists.
  unassignableTemplateIds: number[];
}

// Today's calendar date in the church timezone (YYYY-MM-DD).
function todayKey(now: Date = new Date()): string {
  return dateKeyOf(zonedParts(now));
}

@Injectable()
export class LifeGroupTaskAssignmentsService {
  private readonly logger = new Logger(LifeGroupTaskAssignmentsService.name);

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly roster: LifeGroupTaskRosterService,
    private readonly notifier: LifeGroupTaskNotifier,
  ) {}

  // ---- helpers ---------------------------------------------------------

  private async loadAccessibleGroup(
    lifeGroupId: number,
    scope: ResolvedScope,
    actor: TaskActor,
  ): Promise<LifeGroup> {
    const lifeGroup = await findLifeGroupOrThrow(this.em, lifeGroupId);
    assertCanAccessLifeGroup(lifeGroup, scope, actor);
    return lifeGroup;
  }

  private assertMatchesMeetingDay(
    lifeGroup: LifeGroup,
    meetingDate: string,
  ): void {
    const expected = lifeGroup.meetingDay
      ? WEEKDAY_INDEX[lifeGroup.meetingDay]
      : undefined;
    if (expected === undefined) return;
    if (weekdayOfDateString(meetingDate) !== expected) {
      throw new BadRequestException(
        `${meetingDate} is not a ${lifeGroup.meetingDay} — this life group meets on ${lifeGroup.meetingDay}.`,
      );
    }
  }

  /**
   * Manual generation only accepts dates close to now: a short grace window
   * in the past (late draws) and a bounded horizon ahead. Dates far away would
   * pollute the fairness history (it counts every non-skipped date).
   */
  private assertMeetingDateInWindow(meetingDate: string): void {
    const today = zonedParts(new Date());
    const earliest = dateKeyOf(shiftDays(today, -MAX_DAYS_BACK));
    const latest = dateKeyOf(shiftDays(today, MAX_DAYS_AHEAD));
    // YYYY-MM-DD strings compare chronologically.
    if (meetingDate < earliest) {
      throw new BadRequestException(
        `meeting_date cannot be more than ${MAX_DAYS_BACK} days in the past.`,
      );
    }
    if (meetingDate > latest) {
      throw new BadRequestException(
        `meeting_date cannot be more than ${MAX_DAYS_AHEAD} days ahead.`,
      );
    }
  }

  private async enabledTemplates(
    lifeGroupId: number,
  ): Promise<EnabledTemplate[]> {
    const templates = await this.em.find(LifeGroupTaskTemplate, {
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    const overrides = await this.em.find(LifeGroupTaskOverride, {
      where: { lifeGroupId },
    });
    const byTemplate = new Map(overrides.map((o) => [o.templateId, o]));
    const result: EnabledTemplate[] = [];
    for (const template of templates) {
      const override = byTemplate.get(template.id);
      if (override && !override.isEnabled) continue;
      const overrideGuidance = override?.guidanceOverride;
      result.push({
        template,
        guidance:
          overrideGuidance && overrideGuidance.trim() !== ''
            ? overrideGuidance
            : template.guidance,
      });
    }
    return result;
  }

  /**
   * Fairness history: every assignment of this group except the meeting being
   * (re)computed, dates the leader skipped, and declined rows.
   */
  private async loadHistory(lifeGroupId: number, meetingDate: string) {
    const rows: HistoryRow[] = await this.em.query(
      `SELECT a.user_id AS user_id, a.template_id AS template_id,
              COUNT(*)::int AS n
       FROM life_group_task_assignments a
       WHERE a.life_group_id = $1
         AND a.meeting_date <> $2
         AND a.status <> 'declined'
         AND NOT EXISTS (
           SELECT 1 FROM life_group_task_skips s
           WHERE s.life_group_id = a.life_group_id
             AND s.meeting_date = a.meeting_date
         )
       GROUP BY a.user_id, a.template_id`,
      [lifeGroupId, meetingDate],
    );
    const totalCounts: Record<number, number> = {};
    const templateCounts: Record<number, Record<number, number>> = {};
    for (const row of rows) {
      const userId = Number(row.user_id);
      const templateId = Number(row.template_id);
      const n = Number(row.n);
      totalCounts[userId] = (totalCounts[userId] ?? 0) + n;
      templateCounts[userId] = templateCounts[userId] ?? {};
      templateCounts[userId][templateId] = n;
    }
    return { totalCounts, templateCounts };
  }

  private excludedUserIdsFor(roster: LifeGroupRoster, templateId: number) {
    return roster.members
      .filter((m) => m.setting?.excludedTemplateIds?.includes(templateId))
      .map((m) => m.user.id);
  }

  private notice(assignment: LifeGroupTaskAssignment): LifeGroupTaskNotice {
    return {
      assignmentId: assignment.id,
      userId: assignment.userId,
      lifeGroupId: assignment.lifeGroupId,
      meetingDate: assignment.meetingDate,
      taskName: assignment.taskName,
    };
  }

  private async findMeetingAssignments(
    lifeGroupId: number,
    meetingDate: string,
  ): Promise<LifeGroupTaskAssignment[]> {
    return this.em.find(LifeGroupTaskAssignment, {
      where: { lifeGroupId, meetingDate },
      relations: ['user'],
    });
  }

  // ---- generation ------------------------------------------------------

  /**
   * Idempotent generation for one meeting. Already existing rows are never
   * recomputed; only enabled templates without a row get assigned. Used by
   * the HTTP endpoint (after the access check) and by the reminder evaluator.
   */
  async generateForGroup(
    lifeGroup: LifeGroup,
    meetingDate: string,
  ): Promise<GenerationResult> {
    const skip = await this.em.findOne(LifeGroupTaskSkip, {
      where: { lifeGroupId: lifeGroup.id, meetingDate },
    });
    if (skip) {
      return {
        meetingDate,
        skipped: true,
        assignments: [],
        created: [],
        unassignableTemplateIds: [],
      };
    }

    const enabled = await this.enabledTemplates(lifeGroup.id);
    const before = await this.findMeetingAssignments(lifeGroup.id, meetingDate);
    const hasRow = new Set(before.map((a) => a.templateId));
    const todo = enabled.filter((e) => !hasRow.has(e.template.id));
    if (todo.length === 0) {
      return {
        meetingDate,
        skipped: false,
        assignments: this.sortByTemplate(before, enabled),
        created: [],
        unassignableTemplateIds: [],
      };
    }

    const roster = await this.roster.resolveRoster(lifeGroup);
    const history = await this.loadHistory(lifeGroup.id, meetingDate);
    const result = assignTasks({
      tasks: todo.map((e) => ({
        templateId: e.template.id,
        excludedUserIds: this.excludedUserIdsFor(roster, e.template.id),
      })),
      pool: roster.members.filter((m) => m.eligible).map((m) => m.user.id),
      totalCounts: history.totalCounts,
      templateCounts: history.templateCounts,
      alreadyAssignedUserIds: before
        .filter((a) => a.status !== 'declined')
        .map((a) => a.userId),
    });

    const byTemplate = new Map(todo.map((e) => [e.template.id, e]));
    const rows = result.assignments.map((a) => {
      const entry = byTemplate.get(a.templateId) as EnabledTemplate;
      return {
        lifeGroupId: lifeGroup.id,
        templateId: a.templateId,
        meetingDate,
        userId: a.userId,
        taskName: entry.template.name,
        taskDescription: entry.template.description,
        taskGuidance: entry.guidance,
        status: 'assigned' as const,
        source: 'auto' as const,
      };
    });
    if (rows.length > 0) {
      // ON CONFLICT DO NOTHING: concurrent generation never double-assigns
      // and never raises a unique violation.
      await this.em
        .createQueryBuilder()
        .insert()
        .into(LifeGroupTaskAssignment)
        .values(rows)
        .orIgnore()
        .execute();
    }

    const after = await this.findMeetingAssignments(lifeGroup.id, meetingDate);
    const beforeIds = new Set(before.map((a) => a.id));
    const created = after.filter((a) => !beforeIds.has(a.id));

    if (result.unassignableTemplateIds.length > 0) {
      await this.notifier.notifyUnassignable({
        lifeGroupId: lifeGroup.id,
        meetingDate,
        taskNames: result.unassignableTemplateIds.map(
          (id) => (byTemplate.get(id) as EnabledTemplate).template.name,
        ),
      });
    }

    return {
      meetingDate,
      skipped: false,
      assignments: this.sortByTemplate(after, enabled),
      created: this.sortByTemplate(created, enabled),
      unassignableTemplateIds: result.unassignableTemplateIds,
    };
  }

  /** System entry point (no actor): loads the group, then generates. */
  async generateForMeeting(
    lifeGroupId: number,
    meetingDate: string,
  ): Promise<GenerationResult> {
    const lifeGroup = await findLifeGroupOrThrow(this.em, lifeGroupId);
    return this.generateForGroup(lifeGroup, meetingDate);
  }

  private sortByTemplate(
    assignments: LifeGroupTaskAssignment[],
    enabled: EnabledTemplate[],
  ): LifeGroupTaskAssignment[] {
    const order = new Map(enabled.map((e, i) => [e.template.id, i]));
    return [...assignments].sort(
      (a, b) =>
        (order.get(a.templateId) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(b.templateId) ?? Number.MAX_SAFE_INTEGER),
    );
  }

  /**
   * Manual generate path only: push the newly created assignees (those with
   * `notified_at` null) through the same notifier claim the evaluator uses.
   * A failed push must not fail the generation (the claim is released and
   * the evaluator may still send it).
   */
  private async notifyCreated(created: LifeGroupTaskAssignment[]) {
    const notices = created
      .filter((a) => a.status === 'assigned' && a.notifiedAt === null)
      .map((a) => this.notice(a));
    if (notices.length === 0) return;
    try {
      await this.notifier.notifyGenerated(notices);
    } catch (err) {
      this.logger.error(
        'Could not notify manually generated assignees',
        err instanceof Error ? err.stack : undefined,
      );
    }
  }

  /** `meetingDate` defaults to the group's next meeting when omitted. */
  async generate(
    lifeGroupId: number,
    requestedDate: string | undefined,
    scope: ResolvedScope,
    actor: TaskActor,
  ) {
    if (requestedDate !== undefined) {
      assertValidDateString(requestedDate, 'meeting_date');
    }
    const lifeGroup = await this.loadAccessibleGroup(
      lifeGroupId,
      scope,
      actor,
    );
    const meetingDate =
      requestedDate ?? nextMeetingDate(new Date(), lifeGroup.meetingDay);
    if (!meetingDate) {
      throw new BadRequestException(
        'meeting_date is required for a life group without a fixed meeting day.',
      );
    }
    this.assertMatchesMeetingDay(lifeGroup, meetingDate);
    this.assertMeetingDateInWindow(meetingDate);
    const result = await this.generateForGroup(lifeGroup, meetingDate);
    await this.notifyCreated(result.created);
    const roster = await this.roster.resolveRoster(lifeGroup);
    return {
      ...(await this.toGroupResponse(lifeGroup, meetingDate, result, roster)),
      unassignable_template_ids: result.unassignableTemplateIds,
    };
  }

  // ---- leader/admin listing -------------------------------------------

  private async toGroupResponse(
    lifeGroup: LifeGroup,
    meetingDate: string,
    result: Pick<GenerationResult, 'skipped' | 'assignments'>,
    roster: LifeGroupRoster,
  ) {
    const enabled = await this.enabledTemplates(lifeGroup.id);
    const eligibleByUser = new Map(
      roster.members.map((m) => [m.user.id, m.eligible]),
    );
    const hasRow = new Set(result.assignments.map((a) => a.templateId));
    return {
      meeting_date: meetingDate,
      skipped: result.skipped,
      assignments: result.assignments.map((a) =>
        this.toGroupItem(a, eligibleByUser),
      ),
      unassigned_templates: result.skipped
        ? []
        : enabled
            .filter((e) => !hasRow.has(e.template.id))
            .map((e) => ({
              template_id: e.template.id,
              name: e.template.name,
            })),
    };
  }

  private toGroupItem(
    a: LifeGroupTaskAssignment,
    eligibleByUser: Map<number, boolean>,
  ) {
    return {
      id: a.id,
      template_id: a.templateId,
      meeting_date: a.meetingDate,
      user_id: a.userId,
      user_name: a.user?.name ?? '',
      task_name: a.taskName,
      task_description: a.taskDescription,
      task_guidance: a.taskGuidance,
      status: a.status,
      source: a.source,
      notified_at: a.notifiedAt,
      reminded_at: a.remindedAt,
      // False when the assignee became ineligible after being assigned (the
      // panel offers a re-roll). Never exposes the leader's eligibility note.
      assignee_eligible: eligibleByUser.get(a.userId) ?? false,
    };
  }

  async list(
    lifeGroupId: number,
    meetingDate: string,
    scope: ResolvedScope,
    actor: TaskActor,
  ) {
    assertValidDateString(meetingDate, 'date');
    const lifeGroup = await this.loadAccessibleGroup(
      lifeGroupId,
      scope,
      actor,
    );
    const skip = await this.em.findOne(LifeGroupTaskSkip, {
      where: { lifeGroupId, meetingDate },
    });
    const assignments = await this.findMeetingAssignments(
      lifeGroupId,
      meetingDate,
    );
    const enabled = await this.enabledTemplates(lifeGroupId);
    const roster = await this.roster.resolveRoster(lifeGroup);
    return this.toGroupResponse(
      lifeGroup,
      meetingDate,
      {
        skipped: !!skip,
        assignments: this.sortByTemplate(assignments, enabled),
      },
      roster,
    );
  }

  // ---- re-roll / reassign / decline -----------------------------------

  /**
   * Picks a replacement for `assignment`: eligible members only, never the
   * current assignee (reroll) / decliner (decline) nor anyone who already
   * declined this task (`declined_user_ids`), honouring per-template
   * exclusions and fairness. Returns null when nobody qualifies.
   */
  private async pickReplacement(
    lifeGroup: LifeGroup,
    assignment: LifeGroupTaskAssignment,
  ): Promise<number | null> {
    const roster = await this.roster.resolveRoster(lifeGroup);
    const history = await this.loadHistory(
      lifeGroup.id,
      assignment.meetingDate,
    );
    const siblings = await this.em.find(LifeGroupTaskAssignment, {
      where: {
        lifeGroupId: lifeGroup.id,
        meetingDate: assignment.meetingDate,
      },
    });
    const result = assignTasks({
      tasks: [
        {
          templateId: assignment.templateId,
          excludedUserIds: [
            ...this.excludedUserIdsFor(roster, assignment.templateId),
            assignment.userId,
            // Anyone who already declined this (group, template, date).
            ...(assignment.declinedUserIds ?? []),
          ],
        },
      ],
      pool: roster.members.filter((m) => m.eligible).map((m) => m.user.id),
      totalCounts: history.totalCounts,
      templateCounts: history.templateCounts,
      alreadyAssignedUserIds: siblings
        .filter((s) => s.id !== assignment.id && s.status !== 'declined')
        .map((s) => s.userId),
    });
    return result.assignments[0]?.userId ?? null;
  }

  private withDecliner(
    assignment: LifeGroupTaskAssignment,
    userId: number,
  ): number[] {
    const current = assignment.declinedUserIds ?? [];
    return current.includes(userId) ? current : [...current, userId];
  }

  /**
   * Hands the assignment to `newUserId`. Guarded on the previous assignee so
   * two concurrent changes cannot both win.
   */
  private async applyReassignment(
    assignment: LifeGroupTaskAssignment,
    newUserId: number,
    source: 'reroll' | 'manual',
    reason: LifeGroupTaskReassignReason,
  ): Promise<LifeGroupTaskAssignment> {
    const previousUserId = assignment.userId;
    // A decline records the decliner so nobody gets the task back later.
    const declinedUserIds =
      reason === 'decline'
        ? this.withDecliner(assignment, previousUserId)
        : undefined;
    const result = await this.em.update(
      LifeGroupTaskAssignment,
      { id: assignment.id, userId: previousUserId },
      {
        userId: newUserId,
        status: 'assigned',
        source,
        notifiedAt: null,
        remindedAt: null,
        ...(declinedUserIds ? { declinedUserIds } : {}),
      },
    );
    if (result.affected === 0) {
      throw new ConflictException(
        'This task was changed by someone else; reload and try again.',
      );
    }
    const updated = await this.em.findOne(LifeGroupTaskAssignment, {
      where: { id: assignment.id },
      relations: ['user'],
    });
    if (!updated) throw new NotFoundException('Task assignment not found');
    await this.notifier.notifyReassigned(this.notice(updated), {
      previousUserId,
      reason,
    });
    return updated;
  }

  private async findGroupAssignment(
    lifeGroupId: number,
    assignmentId: string,
  ): Promise<LifeGroupTaskAssignment> {
    const assignment = await this.em.findOne(LifeGroupTaskAssignment, {
      where: { id: assignmentId, lifeGroupId },
      relations: ['user'],
    });
    if (!assignment) {
      throw new NotFoundException('Task assignment not found');
    }
    return assignment;
  }

  private async singleResponse(
    lifeGroup: LifeGroup,
    assignment: LifeGroupTaskAssignment,
  ) {
    const roster = await this.roster.resolveRoster(lifeGroup);
    const eligibleByUser = new Map(
      roster.members.map((m) => [m.user.id, m.eligible]),
    );
    return this.toGroupItem(assignment, eligibleByUser);
  }

  async reroll(
    lifeGroupId: number,
    assignmentId: string,
    scope: ResolvedScope,
    actor: TaskActor,
  ) {
    const lifeGroup = await this.loadAccessibleGroup(
      lifeGroupId,
      scope,
      actor,
    );
    const assignment = await this.findGroupAssignment(
      lifeGroupId,
      assignmentId,
    );
    const newUserId = await this.pickReplacement(lifeGroup, assignment);
    if (newUserId === null) {
      throw new ConflictException(
        'No other eligible member is available for this task.',
      );
    }
    const updated = await this.applyReassignment(
      assignment,
      newUserId,
      'reroll',
      'reroll',
    );
    return this.singleResponse(lifeGroup, updated);
  }

  async reassign(
    lifeGroupId: number,
    assignmentId: string,
    userId: number,
    scope: ResolvedScope,
    actor: TaskActor,
  ) {
    const lifeGroup = await this.loadAccessibleGroup(
      lifeGroupId,
      scope,
      actor,
    );
    const assignment = await this.findGroupAssignment(
      lifeGroupId,
      assignmentId,
    );
    const roster = await this.roster.resolveRoster(lifeGroup);
    if (!roster.members.some((m) => m.user.id === userId)) {
      throw new BadRequestException(
        'The selected user is not an active member of this life group.',
      );
    }
    if (assignment.userId === userId && assignment.status === 'assigned') {
      return this.singleResponse(lifeGroup, assignment);
    }
    const updated = await this.applyReassignment(
      assignment,
      userId,
      'manual',
      'manual',
    );
    return this.singleResponse(lifeGroup, updated);
  }

  /**
   * Member declines their own task: the task is re-rolled to another eligible
   * member (never the decliner). With nobody left it stays `declined` and the
   * leader is told. The response never reveals who took over.
   */
  async decline(assignmentId: string, actor: TaskActor) {
    const assignment = await this.em.findOne(LifeGroupTaskAssignment, {
      where: { id: assignmentId, userId: actor.id },
    });
    if (!assignment) {
      throw new NotFoundException('Task assignment not found');
    }
    if (assignment.status !== 'assigned') {
      throw new ConflictException('This task can no longer be declined.');
    }
    if (assignment.meetingDate < todayKey()) {
      throw new BadRequestException('This meeting has already happened.');
    }

    const lifeGroup = await findLifeGroupOrThrow(
      this.em,
      assignment.lifeGroupId,
    );
    const newUserId = await this.pickReplacement(lifeGroup, assignment);
    if (newUserId === null) {
      await this.em.update(
        LifeGroupTaskAssignment,
        { id: assignment.id, userId: actor.id },
        {
          status: 'declined',
          declinedUserIds: this.withDecliner(assignment, actor.id),
        },
      );
      await this.notifier.notifyUnassignable({
        lifeGroupId: assignment.lifeGroupId,
        meetingDate: assignment.meetingDate,
        taskNames: [assignment.taskName],
      });
      return { id: assignment.id, status: 'declined', reassigned: false };
    }
    await this.applyReassignment(assignment, newUserId, 'reroll', 'decline');
    return { id: assignment.id, status: 'declined', reassigned: true };
  }

  // ---- member views ----------------------------------------------------

  // Explicit field list on purpose: member endpoints must never expose the
  // leader's eligibility note, other members, or assignment internals.
  private toMemberItem(a: LifeGroupTaskAssignment) {
    return {
      id: a.id,
      life_group_id: a.lifeGroupId,
      life_group_name: a.lifeGroup?.name ?? '',
      meeting_date: a.meetingDate,
      task_name: a.taskName,
      task_description: a.taskDescription,
      task_guidance: a.taskGuidance,
      status: a.status,
    };
  }

  /** Upcoming (today onward) tasks of the requesting member. */
  async listMine(actor: TaskActor) {
    const assignments = await this.em.find(LifeGroupTaskAssignment, {
      where: {
        userId: actor.id,
        status: In(['assigned', 'completed']),
        meetingDate: MoreThanOrEqual(todayKey()),
      },
      relations: ['lifeGroup'],
      order: { meetingDate: 'ASC' },
    });
    return assignments.map((a) => this.toMemberItem(a));
  }

  async getMine(assignmentId: string, actor: TaskActor) {
    const assignment = await this.em.findOne(LifeGroupTaskAssignment, {
      where: { id: assignmentId, userId: actor.id },
      relations: ['lifeGroup'],
    });
    if (!assignment) {
      throw new NotFoundException('Task assignment not found');
    }
    return this.toMemberItem(assignment);
  }
}
