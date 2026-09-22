import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  // Reserved for a future self-service endpoint (POST /guest-origins/me) —
  // throws if the user already has an origin recorded, since a guest's
  // origin should only ever be set once through self-service.
  async setForUser(
    userId: number,
    input: GuestOriginInput,
  ): Promise<GuestOrigin> {
    this.validate(input);
    const existing = await this.repo.findOne({ where: { userId } });
    if (existing) {
      throw new ConflictException('Guest origin already set for this user');
    }
    return this.repo.save(this.repo.create(this.build(userId, input)));
  }

  // Internal callers (report guest-list creation, form-guests, self
  // registration) MUST use this instead of setForUser — a guest can be
  // encountered more than once (e.g. a second Casa de Paz visit), and that
  // must be a no-op rather than a 409.
  async ensureForUser(
    userId: number,
    input: GuestOriginInput,
  ): Promise<GuestOrigin> {
    const existing = await this.repo.findOne({ where: { userId } });
    if (existing) return existing;
    this.validate(input);
    return this.repo.save(this.repo.create(this.build(userId, input)));
  }
}
