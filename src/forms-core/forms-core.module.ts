import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormSubmissionAuditLog } from './entities/form-submission-audit-log.entity';
import { FormSubmissionAuditService } from './services/form-submission-audit.service';
import { FormSubmissionPolicyService } from './services/form-submission-policy.service';
import { ScopeResolverService } from './services/scope-resolver.service';
import { ScopeGuard } from './guards/scope.guard';
import { User } from '../users/entities/user.entity';
import { LifeGroup } from '../life-groups/entities/life-group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FormSubmissionAuditLog, User, LifeGroup])],
  providers: [FormSubmissionAuditService, FormSubmissionPolicyService, ScopeResolverService, ScopeGuard],
  exports: [FormSubmissionAuditService, FormSubmissionPolicyService, ScopeResolverService, ScopeGuard, TypeOrmModule],
})
export class FormsCoreModule {}
