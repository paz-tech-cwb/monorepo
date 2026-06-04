import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FormSubmissionAuditLog,
  FormAuditAction,
} from '../entities/form-submission-audit-log.entity';

@Injectable()
export class FormSubmissionAuditService {
  constructor(
    @InjectRepository(FormSubmissionAuditLog)
    private readonly repo: Repository<FormSubmissionAuditLog>,
  ) {}

  async record(params: {
    formSlug: string;
    submissionId: string;
    actorId: number;
    action: FormAuditAction;
    diff?: Record<string, unknown> | null;
  }): Promise<void> {
    await this.repo.insert({
      formSlug: params.formSlug,
      submissionId: params.submissionId,
      actor: { id: params.actorId } as any,
      action: params.action,

      diff: (params.diff ?? null) as any,
    });
  }

  async listForSubmission(formSlug: string, submissionId: string) {
    return this.repo.find({
      where: { formSlug, submissionId },
      relations: ['actor'],
      order: { createdAt: 'DESC' },
    });
  }
}
