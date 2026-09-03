import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormSubmissionAuditLog } from './entities/form-submission-audit-log.entity';
import { ChurchSetting } from './entities/church-setting.entity';
import { FormSubmissionAuditService } from './services/form-submission-audit.service';
import { FormSubmissionPolicyService } from './services/form-submission-policy.service';
import { ScopeResolverService } from './services/scope-resolver.service';
import { ScopeGuard } from './guards/scope.guard';
import { ChurchSettingsService } from './services/church-settings.service';
import {
  NotificationSender,
  ResendNotificationSender,
} from './services/notification-sender';
import { User } from '../users/entities/user.entity';
import { LifeGroup } from '../life-groups/entities/life-group.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FormSubmissionAuditLog,
      ChurchSetting,
      User,
      LifeGroup,
    ]),
  ],
  providers: [
    FormSubmissionAuditService,
    FormSubmissionPolicyService,
    ScopeResolverService,
    ScopeGuard,
    ChurchSettingsService,
    { provide: NotificationSender, useClass: ResendNotificationSender },
  ],
  exports: [
    FormSubmissionAuditService,
    FormSubmissionPolicyService,
    ScopeResolverService,
    ScopeGuard,
    ChurchSettingsService,
    NotificationSender,
    TypeOrmModule,
  ],
})
export class FormsCoreModule {}
