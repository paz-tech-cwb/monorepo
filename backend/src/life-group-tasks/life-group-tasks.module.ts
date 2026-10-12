import { Module } from '@nestjs/common';
import { FormsCoreModule } from '../forms-core/forms-core.module';
import { LifeGroupTaskAssignmentsService } from './life-group-task-assignments.service';
import { LifeGroupTaskConfigService } from './life-group-task-config.service';
import { LifeGroupTaskNotifier } from './life-group-task-notifier';
import { NoopLifeGroupTaskNotifier } from './noop-life-group-task-notifier';
import { LifeGroupTaskRosterService } from './life-group-task-roster.service';
import { LifeGroupTaskTemplatesController } from './life-group-task-templates.controller';
import { LifeGroupTaskTemplatesService } from './life-group-task-templates.service';
import { LifeGroupTasksController } from './life-group-tasks.controller';
import { MyLifeGroupTasksController } from './my-life-group-tasks.controller';

@Module({
  imports: [FormsCoreModule],
  controllers: [
    LifeGroupTaskTemplatesController,
    LifeGroupTasksController,
    MyLifeGroupTasksController,
  ],
  providers: [
    LifeGroupTaskRosterService,
    LifeGroupTaskTemplatesService,
    LifeGroupTaskConfigService,
    LifeGroupTaskAssignmentsService,
    // Replaced by the real notification-backed implementation in B3.
    { provide: LifeGroupTaskNotifier, useClass: NoopLifeGroupTaskNotifier },
  ],
  exports: [
    LifeGroupTaskAssignmentsService,
    LifeGroupTaskRosterService,
    LifeGroupTaskNotifier,
  ],
})
export class LifeGroupTasksModule {}
