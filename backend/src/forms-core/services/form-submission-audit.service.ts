import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import {
  FormSubmissionAuditLog,
  FormAuditAction,
} from '../entities/form-submission-audit-log.entity';
import { User } from '../../users/entities/user.entity';

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
      actor: { id: params.actorId } as Pick<User, 'id'> as User,
      action: params.action,
      diff: (params.diff ?? null) as QueryDeepPartialEntity<Record<
        string,
        unknown
      > | null>,
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
