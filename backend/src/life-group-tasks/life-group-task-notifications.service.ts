import { createHash } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Notification } from '../notifications/entities/notification.entity';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { User } from '../users/entities/user.entity';
import { ReminderDispatchLog } from '../reminders/entities/reminder-dispatch-log.entity';
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

  /** Assignment push (largest offset). Marks `notified_at`. */
  async notifyAssignee(
    assignment: LifeGroupTaskAssignment,
    user: User,
    title: string,
    message: string,
  ): Promise<void> {
    await this.send([user], {
      title,
      message: renderTaskMessage(message, assignment.taskName),
      deepLink: taskDeepLink(assignment.id),
    });
    await this.em.update(
      LifeGroupTaskAssignment,
      { id: assignment.id },
      { notifiedAt: new Date() },
    );
  }

  /** Follow-up reminder (smaller offsets). Marks `reminded_at`. */
  async remindAssignee(
    assignment: LifeGroupTaskAssignment,
    user: User,
    title: string,
    message: string,
  ): Promise<void> {
    await this.send([user], {
      title,
      message: renderTaskMessage(message, assignment.taskName),
      deepLink: taskDeepLink(assignment.id),
    });
    await this.em.update(
      LifeGroupTaskAssignment,
      { id: assignment.id },
      { remindedAt: new Date() },
    );
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
      await this.send([assignee], {
        title: 'Você recebeu uma tarefa no Life Group',
        message: `Você foi escolhido(a) para "${notice.taskName}" no Life Group de ${shortDate(notice.meetingDate)}. Toque para ver o guia.`,
        deepLink: taskDeepLink(notice.assignmentId),
      });
      await this.em.update(
        LifeGroupTaskAssignment,
        { id: notice.assignmentId },
        { notifiedAt: new Date() },
      );
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
    const already = await this.em.findOne(ReminderDispatchLog, {
      where: { ruleType: 'life_group_tasks', dedupeKey },
    });
    if (already) return;

    const leaders = await this.leadersOf(context.lifeGroupId);
    await this.send(leaders, {
      title: 'Tarefa sem responsável no Life Group',
      message: `Nenhum membro elegível para: ${context.taskNames.join(', ')} (${shortDate(context.meetingDate)}). Ajuste a elegibilidade ou atribua manualmente.`,
      deepLink: null,
    });

    try {
      await this.em.insert(ReminderDispatchLog, {
        ruleType: 'life_group_tasks',
        dedupeKey,
      });
    } catch (err: unknown) {
      if ((err as { code?: string }).code !== '23505') {
        this.logger.warn('Could not record unassignable dedupe key');
        throw err;
      }
    }
  }
}
