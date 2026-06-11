import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RemindersService } from './reminders.service';
import { REMINDER_EVALUATORS } from './evaluators/reminder-evaluator.interface';
import type { ReminderEvaluator } from './evaluators/reminder-evaluator.interface';

@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);

  constructor(
    private readonly remindersService: RemindersService,
    @Inject(REMINDER_EVALUATORS)
    private readonly evaluators: ReminderEvaluator[],
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async tick(now: Date = new Date()): Promise<void> {
    const rules = await this.remindersService.findEnabled();
    for (const rule of rules) {
      const evaluator = this.evaluators.find((e) => e.type === rule.type);
      if (!evaluator) continue;
      try {
        await evaluator.run(rule, now);
      } catch (err) {
        this.logger.error(
          `Reminder evaluator '${rule.type}' failed`,
          err as Error,
        );
      }
    }
  }
}
