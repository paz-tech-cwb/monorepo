import { ForbiddenException, Injectable } from '@nestjs/common';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export interface SubmissionLike {
  submittedById: number;
  createdAt: Date;
  deletedAt?: Date | null;
}

export interface ActorLike {
  id: number;
  roleSlug: string;
}

@Injectable()
export class FormSubmissionPolicyService {
  canEdit(actor: ActorLike, submission: SubmissionLike): boolean {
    if (submission.deletedAt) return false;
    if (actor.roleSlug === 'admin') return true;
    if (actor.id !== submission.submittedById) return false;
    return Date.now() - submission.createdAt.getTime() < TWENTY_FOUR_HOURS_MS;
  }

  canDelete(actor: ActorLike): boolean {
    return actor.roleSlug === 'admin';
  }

  assertCanEdit(actor: ActorLike, s: SubmissionLike) {
    if (!this.canEdit(actor, s)) throw new ForbiddenException('Edit not allowed');
  }

  assertCanDelete(actor: ActorLike) {
    if (!this.canDelete(actor)) throw new ForbiddenException('Delete not allowed (admin only)');
  }
}
