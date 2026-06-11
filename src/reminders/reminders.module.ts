import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReminderRule } from './entities/reminder-rule.entity';
import { ReminderDispatchLog } from './entities/reminder-dispatch-log.entity';
import { RemindersService } from './reminders.service';
import { RemindersController } from './reminders.controller';
import { ReminderSchedulerService } from './reminder-scheduler.service';
import { REMINDER_EVALUATORS } from './evaluators/reminder-evaluator.interface';
import { FormReportReminderEvaluator } from './evaluators/form-report-reminder.evaluator';
import { EventReminderEvaluator } from './evaluators/event-reminder.evaluator';
import { MemberJourneyReminderEvaluator } from './evaluators/member-journey-reminder.evaluator';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReminderRule, ReminderDispatchLog]),
    NotificationsModule,
  ],
  controllers: [RemindersController],
  providers: [
    RemindersService,
    ReminderSchedulerService,
    FormReportReminderEvaluator,
    EventReminderEvaluator,
    MemberJourneyReminderEvaluator,
    {
      provide: REMINDER_EVALUATORS,
      useFactory: (
        form: FormReportReminderEvaluator,
        event: EventReminderEvaluator,
        journey: MemberJourneyReminderEvaluator,
      ) => [form, event, journey],
      inject: [
        FormReportReminderEvaluator,
        EventReminderEvaluator,
        MemberJourneyReminderEvaluator,
      ],
    },
  ],
})
export class RemindersModule {}
