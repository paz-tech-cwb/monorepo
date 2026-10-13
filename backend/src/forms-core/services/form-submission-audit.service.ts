import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
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

  // `manager` (optional) writes the row through a caller's transaction so the
  // audit row commits/rolls back together with the data it describes.
  async record(
    params: {
      formSlug: string;
      submissionId: string;
      actorId: number;
      action: FormAuditAction;
      diff?: Record<string, unknown> | null;
    },
    manager?: EntityManager,
  ): Promise<void> {
    const target = manager
      ? manager.getRepository(FormSubmissionAuditLog)
      : this.repo;
    await target.insert({
      formSlug: params.formSlug,
      submissionId: params.submissionId,
      actor: { id: params.actorId } as FormSubmissionAuditLog['actor'],
      action: params.action,

      diff: (params.diff ??
        null) as unknown as QueryDeepPartialEntity<FormSubmissionAuditLog>['diff'],
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
