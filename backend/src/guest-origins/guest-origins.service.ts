import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { GuestOrigin, GuestOriginType } from './entities/guest-origin.entity';
import { User } from '../users/entities/user.entity';

export interface GuestOriginInput {
  originType: GuestOriginType;
  casaDePazId?: string | null;
  invitedByUserId?: number | null;
  invitedByText?: string | null;
}

@Injectable()
export class GuestOriginsService {
  constructor(
    @InjectRepository(GuestOrigin)
    private readonly repo: Repository<GuestOrigin>,
  ) {}

  private validate(input: GuestOriginInput): void {
    if (input.originType === 'casa_de_paz' && !input.casaDePazId) {
      throw new BadRequestException(
        'casa_de_paz_id is required for origin_type "casa_de_paz"',
      );
    }
    // invited_by_member deliberately allows both link fields to be absent —
    // the form-guests path records invitedByText as optional free text, and
    // may have neither when the inviter is unknown.
  }

  private build(userId: number, input: GuestOriginInput): Partial<GuestOrigin> {
    return {
      user: { id: userId } as User,
      originType: input.originType,
      casaDePazId: input.casaDePazId ?? null,
      invitedByUserId: input.invitedByUserId ?? null,
      invitedByText: input.invitedByText ?? null,
    };
  }

  private repoFor(manager?: EntityManager): Repository<GuestOrigin> {
    return manager ? manager.getRepository(GuestOrigin) : this.repo;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    );
  }

  // Reserved for a future self-service endpoint (POST /guest-origins/me) —
  // throws if the user already has an origin recorded, since a guest's
  // origin should only ever be set once through self-service.
  async setForUser(
    userId: number,
    input: GuestOriginInput,
    manager?: EntityManager,
  ): Promise<GuestOrigin> {
    this.validate(input);
    const repo = this.repoFor(manager);
    const existing = await repo.findOne({ where: { userId } });
    if (existing) {
      throw new ConflictException('Guest origin already set for this user');
    }
    return repo.save(repo.create(this.build(userId, input)));
  }

  // Internal callers (report guest-list creation, form-guests, self
  // registration) MUST use this instead of setForUser — a guest can be
  // encountered more than once (e.g. a second Casa de Paz visit), and that
  // must be a no-op rather than a 409. Pass the transactional `manager` when
  // called inside an open transaction (e.g. resolving a brand-new guest
  // User row) so the write lands on the same DB connection — otherwise an
  // out-of-band insert can take an FK lock on the still-uncommitted parent
  // `users` row and self-deadlock until lock_timeout.
  async ensureForUser(
    userId: number,
    input: GuestOriginInput,
    manager?: EntityManager,
  ): Promise<GuestOrigin> {
    const repo = this.repoFor(manager);
    const existing = await repo.findOne({ where: { userId } });
    if (existing) return existing;
    this.validate(input);
    try {
      return await repo.save(repo.create(this.build(userId, input)));
    } catch (error: unknown) {
      // Two requests racing to record the origin for the same brand-new
      // guest (e.g. same email submitted in two reports near-simultaneously)
      // both pass the check-then-insert race; the loser hits the
      // guest_origins.user_id UNIQUE violation — treat it as a no-op, same
      // as if `existing` had been found above.
      if (this.isUniqueViolation(error)) {
        const raced = await repo.findOne({ where: { userId } });
        if (raced) return raced;
      }
      throw error;
    }
  }
}
