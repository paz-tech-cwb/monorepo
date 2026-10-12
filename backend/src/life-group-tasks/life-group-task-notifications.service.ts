import { createHash } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In, IsNull } from 'typeorm';
import { Notification } from '../notifications/entities/notification.entity';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { User } from '../users/entities/user.entity';
import { ReminderRule } from '../reminders/entities/reminder-rule.entity';
import { resolveLifeGroupTasksConfig } from '../reminders/types/reminder-config';
import {
  dateKeyOf,
  shiftDays,
  zonedParts,
} from '../life-group-attendance/meeting-day.util';
import { claimDispatchKey, releaseDispatchKey } from './dispatch-claim';
import { LifeGroupTaskAssignment } from './entities/life-group-task-assignment.entity';
import {
  LifeGroupTaskNotice,
  LifeGroupTaskNotifier,
  LifeGroupTaskReassignContext,
  LifeGroupTaskUnassignableContext,
} from './life-group-task-notifier';

export function taskDeepLink(assignmentId: string): string {
  return `paz://tarefa/${assignmentId}`;
}

/** `2026-06-10` -> `10/06`. */
function shortDate(meetingDate: string): string {
  const [, month, day] = meetingDate.split('-');
  return `${day}/${month}`;
}

/** Replaces the `{task}` placeholder (when present) with the task name. */
export function renderTaskMessage(template: string, taskName: string): string {
  return template.split('{task}').join(taskName);
}

/**
 * Push notifications for the life group tasks feature (category
 * `life_group_task`, not opt-outable). Implements the notifier hook used by
 * the assignment service and exposes the assignee/reminder sends used by the
 * reminder evaluator.
 */
@Injectable()
export class LifeGroupTaskNotificationsService extends LifeGroupTaskNotifier {
  private readonly logger = new Logger(LifeGroupTaskNotificationsService.name);

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly dispatch: NotificationDispatchService,
  ) {
    super();
  }

  private async send(
    recipients: User[],
    payload: { title: string; message: string; deepLink: string | null },
  ): Promise<void> {
    if (recipients.length === 0) return;
    const notification = await this.em.save(
      this.em.create(Notification, {
        title: payload.title,
        message: payload.message,
        deepLink: payload.deepLink,
        category: 'life_group_task',
        channels: ['push'],
        segment: {
          type: 'filtered',
          filters: { user_ids: recipients.map((u) => u.id) },
        },
        status: 'pending',
        origin: 'automatic',
      }),
    );
    await this.dispatch.dispatch(notification, recipients);
  }

  private async leadersOf(lifeGroupId: number): Promise<User[]> {
    const group = await this.em.findOne(LifeGroup, {
      where: { id: lifeGroupId },
      relations: ['leader', 'coLeader'],
    });
    if (!group) return [];
    const leaders = [group.leader, group.coLeader].filter(
      (u): u is User => !!u,
    );
    return leaders.filter(
      (u, i) => leaders.findIndex((x) => x.id === u.id) === i,
    );
  }

  /**
   * Claims the per-assignment marker with a conditional UPDATE
   * (`... WHERE id = ? AND col IS NULL`): only one caller/instance wins, so
   * the push is sent at most once even with overlapping runs.
   */
  private async claimAssignment(
    id: string,
    column: 'notifiedAt' | 'remindedAt',
  ): Promise<boolean> {
    const now = new Date();
    const result =
      column === 'notifiedAt'
        ? await this.em.update(
            LifeGroupTaskAssignment,
            { id, notifiedAt: IsNull() },
            { notifiedAt: now },
          )
        : await this.em.update(
            LifeGroupTaskAssignment,
            { id, remindedAt: IsNull() },
            { remindedAt: now },
          );
    return (result.affected ?? 0) > 0;
  }

  /** Best-effort: puts the marker back to NULL after a failed send. */
  private async releaseAssignment(
    id: string,
    column: 'notifiedAt' | 'remindedAt',
  ): Promise<void> {
    try {
      if (column === 'notifiedAt') {
        await this.em.update(
          LifeGroupTaskAssignment,
          { id },
          { notifiedAt: null },
        );
      } else {
        await this.em.update(
          LifeGroupTaskAssignment,
          { id },
          { remindedAt: null },
        );
      }
    } catch {
      this.logger.warn(`Could not release ${column} claim for ${id}`);
    }
  }

  /** Claim, push, release the claim when the push fails. */
  private async sendClaimed(
    assignmentId: string,
    column: 'notifiedAt' | 'remindedAt',
    recipients: User[],
    payload: { title: string; message: string; deepLink: string | null },
  ): Promise<void> {
    if (!(await this.claimAssignment(assignmentId, column))) return;
    try {
      await this.send(recipients, payload);
    } catch (err) {
      await this.releaseAssignment(assignmentId, column);
      throw err;
    }
  }

  /** Assignment push (largest offset). Claims `notified_at` first. */
  async notifyAssignee(
    assignment: Pick<LifeGroupTaskAssignment, 'id' | 'taskName'>,
    user: User,
    title: string,
    message: string,
  ): Promise<void> {
    await this.sendClaimed(assignment.id, 'notifiedAt', [user], {
      title,
      message: renderTaskMessage(message, assignment.taskName),
      deepLink: taskDeepLink(assignment.id),
    });
  }

  /** Follow-up reminder (smaller offsets). Claims `reminded_at` first. */
  async remindAssignee(
    assignment: Pick<LifeGroupTaskAssignment, 'id' | 'taskName'>,
    user: User,
    title: string,
    message: string,
  ): Promise<void> {
    await this.sendClaimed(assignment.id, 'remindedAt', [user], {
      title,
      message: renderTaskMessage(message, assignment.taskName),
      deepLink: taskDeepLink(assignment.id),
    });
  }

  /**
   * Manual generate by a leader/admin: push the assignees whose
   * `notified_at` is null (same claim as the evaluator, so nobody gets it
   * twice). Skipped when the rule is disabled, the meeting is in the past,
   * or it is farther away than the largest configured offset (the evaluator
   * will notify them at that offset). Also skipped when today IS that largest
   * offset day but the rule's configured `hour` has not been reached yet in
   * America/Sao_Paulo: the evaluator still runs later today and sends it
   * (`notified_at` stays NULL).
   */
  async notifyGenerated(notices: LifeGroupTaskNotice[]): Promise<void> {
    if (notices.length === 0) return;
    const rule = await this.em.findOne(ReminderRule, {
      where: { type: 'life_group_tasks' },
    });
    if (rule && !rule.enabled) return;
    const cfg = resolveLifeGroupTasksConfig(rule?.config);
    const offsets = cfg.days_before_meeting.filter(
      (n) => Number.isInteger(n) && n >= 0,
    );
    if (offsets.length === 0) return;

    const today = zonedParts(new Date());
    const earliest = dateKeyOf(today);
    const latest = dateKeyOf(shiftDays(today, Math.max(...offsets)));
    const evaluatorStillToRunToday = today.hour < cfg.hour;
    const due = notices.filter(
      (n) =>
        n.meetingDate >= earliest &&
        n.meetingDate <= latest &&
        !(evaluatorStillToRunToday && n.meetingDate === latest),
    );
    if (due.length === 0) return;

    const users = await this.em.find(User, {
      where: { id: In([...new Set(due.map((n) => n.userId))]) },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    for (const notice of due) {
      const user = byId.get(notice.userId);
      if (!user) continue;
      try {
        await this.notifyAssignee(
          { id: notice.assignmentId, taskName: notice.taskName },
          user,
          cfg.title,
          cfg.message,
        );
      } catch (err) {
        // The claim was released, so the evaluator can still retry.
        this.logger.error(
          `Could not notify assignee for ${notice.assignmentId}`,
          err instanceof Error ? err.stack : undefined,
        );
      }
    }
  }

  /**
   * A reroll/decline/manual change created a new assignee after (or without)
   * the scheduled push: tell them right away, and tell the leader/co-leader
   * what happened (except for manual changes the leader made themselves).
   */
  async notifyReassigned(
    notice: LifeGroupTaskNotice,
    context: LifeGroupTaskReassignContext,
  ): Promise<void> {
    const assignee = await this.em.findOne(User, {
      where: { id: notice.userId },
    });
    if (assignee) {
      await this.sendClaimed(notice.assignmentId, 'notifiedAt', [assignee], {
        title: 'Você recebeu uma tarefa no Life Group',
        message: `Você foi escolhido(a) para "${notice.taskName}" no Life Group de ${shortDate(notice.meetingDate)}. Toque para ver o guia.`,
        deepLink: taskDeepLink(notice.assignmentId),
      });
    }

    if (context.reason === 'manual') return;
    const previous = await this.em.findOne(User, {
      where: { id: context.previousUserId },
    });
    const leaders = (await this.leadersOf(notice.lifeGroupId)).filter(
      (u) => u.id !== notice.userId,
    );
    const who = assignee?.name ?? 'outro membro';
    const message =
      context.reason === 'decline'
        ? `${previous?.name ?? 'Um membro'} recusou "${notice.taskName}" (${shortDate(notice.meetingDate)}). A tarefa foi sorteada para ${who}.`
        : `A tarefa "${notice.taskName}" (${shortDate(notice.meetingDate)}) foi sorteada novamente para ${who}.`;
    await this.send(leaders, {
      title: 'Tarefa do Life Group atualizada',
      message,
      deepLink: null,
    });
  }

  /**
   * No eligible member for some tasks: tell the leader/co-leader once per
   * (group, date, set of tasks) via ReminderDispatchLog.
   */
  async notifyUnassignable(
    context: LifeGroupTaskUnassignableContext,
  ): Promise<void> {
    if (context.taskNames.length === 0) return;
    const digest = createHash('sha1')
      .update([...context.taskNames].sort().join('|'))
      .digest('hex');
    const dedupeKey = `life_group_tasks:${context.lifeGroupId}:${context.meetingDate}:unassignable:${digest}`;
    // Claim first: a concurrent run that loses the claim stays silent.
    if (!(await claimDispatchKey(this.em, dedupeKey))) return;

    try {
      const leaders = await this.leadersOf(context.lifeGroupId);
      await this.send(leaders, {
        title: 'Tarefa sem responsável no Life Group',
        message: `Nenhum membro elegível para: ${context.taskNames.join(', ')} (${shortDate(context.meetingDate)}). Ajuste a elegibilidade ou atribua manualmente.`,
        deepLink: null,
      });
    } catch (err) {
      // Release so the next generation attempt retries the leader push.
      await releaseDispatchKey(this.em, dedupeKey);
      throw err;
    }
  }
}
