import { Expose } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import type { GuestOriginType } from '../entities/guest-origin.entity';

export class SetGuestOriginDto {
  @Expose({ name: 'origin_type' })
  @IsIn(['casa_de_paz', 'invited_by_member', 'self'])
  originType: GuestOriginType;

  @Expose({ name: 'casa_de_paz_id' })
  @IsOptional()
  @IsUUID()
  casaDePazId?: string;

  @Expose({ name: 'invited_by_user_id' })
  @IsOptional()
  invitedByUserId?: number;

  @Expose({ name: 'invited_by_text' })
  @IsOptional()
  @IsString()
  @Length(1, 180)
  invitedByText?: string;
}
