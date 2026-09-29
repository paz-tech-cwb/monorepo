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
    // Two requests racing to record the origin for the same brand-new guest
    // (e.g. same email submitted in two reports near-simultaneously) both
    // pass the check-then-insert race. Use `INSERT ... ON CONFLICT (user_id)
    // DO NOTHING` via `orIgnore()` so the loser's insert never raises a
    // unique-violation error — that matters because inside an open
    // transaction, a raised 23505 aborts the whole transaction and the very
    // next statement (a recovery re-read) would fail with 25P02 instead of
    // returning the raced row. With orIgnore() no error is ever raised, so a
    // single follow-up read safely returns whichever row (ours or the
    // racer's) ended up persisted — first-origin-wins either way.
    await repo
      .createQueryBuilder()
      .insert()
      .into(GuestOrigin)
      .values(this.build(userId, input))
      .orIgnore()
      .execute();
    const saved = await repo.findOne({ where: { userId } });
    if (!saved) {
      throw new Error(
        `ensureForUser: expected a guest_origins row for userId=${userId} after insert/orIgnore, found none`,
      );
    }
    return saved;
  }
}
