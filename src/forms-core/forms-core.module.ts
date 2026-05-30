import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormSubmissionAuditLog } from './entities/form-submission-audit-log.entity';
import { FormSubmissionAuditService } from './services/form-submission-audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([FormSubmissionAuditLog])],
  providers: [FormSubmissionAuditService],
  exports: [FormSubmissionAuditService, TypeOrmModule],
})
export class FormsCoreModule {}
