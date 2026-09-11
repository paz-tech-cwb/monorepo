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
import { LifeGroupAttendanceReminderEvaluator } from './evaluators/life-group-attendance-reminder.evaluator';
import { NotificationsModule } from '../notifications/notifications.module';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { LifeGroupAttendance } from '../life-group-attendance/entities/life-group-attendance.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReminderRule,
      ReminderDispatchLog,
      LifeGroup,
      LifeGroupAttendance,
    ]),
    NotificationsModule,
  ],
  controllers: [RemindersController],
  providers: [
    RemindersService,
    ReminderSchedulerService,
    FormReportReminderEvaluator,
    EventReminderEvaluator,
    MemberJourneyReminderEvaluator,
    LifeGroupAttendanceReminderEvaluator,
    {
      provide: REMINDER_EVALUATORS,
      useFactory: (
        form: FormReportReminderEvaluator,
        event: EventReminderEvaluator,
        journey: MemberJourneyReminderEvaluator,
        attendance: LifeGroupAttendanceReminderEvaluator,
      ) => [form, event, journey, attendance],
      inject: [
        FormReportReminderEvaluator,
        EventReminderEvaluator,
        MemberJourneyReminderEvaluator,
        LifeGroupAttendanceReminderEvaluator,
      ],
    },
  ],
})
export class RemindersModule {}
