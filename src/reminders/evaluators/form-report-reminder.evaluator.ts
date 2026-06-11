import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import type { ReminderEvaluator } from './reminder-evaluator.interface';
import { ReminderRule } from '../entities/reminder-rule.entity';
import type {
  FormReportReminderConfig,
  ReminderRuleType,
} from '../types/reminder-config';
import { Notification } from '../../notifications/entities/notification.entity';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';
import { User } from '../../users/entities/user.entity';
import { MeetingReport } from '../../meeting-reports/entities/meeting-report.entity';

@Injectable()
export class FormReportReminderEvaluator implements ReminderEvaluator {
  readonly type: ReminderRuleType = 'form_report';

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly dispatch: NotificationDispatchService,
  ) {}

  async run(rule: ReminderRule, now: Date): Promise<void> {
    const cfg = rule.config as FormReportReminderConfig;
    if (now.getDay() !== cfg.weekday || now.getHours() !== cfg.hour) return;

    // start of the current period = beginning of today (the configured weekday)
    const periodStart = new Date(now);
    periodStart.setHours(0, 0, 0, 0);
    if (rule.lastRunAt && rule.lastRunAt >= periodStart) return;

    // leaders in the configured roles
    const leaders = await this.em
      .createQueryBuilder(User, 'u')
      .leftJoinAndSelect('u.role', 'role')
      .where('role.slug IN (:...roles)', { roles: cfg.roles })
      .getMany();
    if (leaders.length === 0) {
      await this.em.update(ReminderRule, rule.id, { lastRunAt: now });
      return;
    }

    // leaders who already submitted a report this period
    // MeetingReport.leader has no @JoinColumn, so TypeORM generates FK column `leaderId`
    const reported = await this.em
      .createQueryBuilder(MeetingReport, 'm')
      .select('m.leaderId', 'leaderId')
      .where('m.created_at >= :start', { start: periodStart })
      .getRawMany<{ leaderId: number }>();
    const reportedIds = new Set(reported.map((r) => Number(r.leaderId)));

    const targets = leaders.filter((l) => !reportedIds.has(l.id));
    if (targets.length > 0) {
      const notification = await this.em.save(
        this.em.create(Notification, {
          title: 'Lembrete: relatório de reunião pendente',
          message:
            'Você ainda não enviou o relatório da reunião desta semana. Toque para enviar.',
          category: 'meeting_reports',
          channels: ['push'],
          segment: { type: 'filtered', filters: { roles: cfg.roles } },
          status: 'pending',
          origin: 'automatic',
        }),
      );
      await this.dispatch.dispatch(notification, targets);
    }

    await this.em.update(ReminderRule, rule.id, { lastRunAt: now });
  }
}
