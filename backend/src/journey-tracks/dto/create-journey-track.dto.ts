import { Expose } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { VALID_ROLE_SLUGS } from '../../users/dto/update-user-role.dto';

export class CreateJourneyTrackDto {
  @Expose()
  @IsString()
  @Matches(/^[a-z0-9_]{1,50}$/, {
    message:
      'key must contain only lowercase letters, numbers, and underscores',
  })
  key: string;

  @Expose()
  @IsString()
  title: string;

  @Expose()
  @IsOptional()
  @IsString()
  description?: string | null;

  @Expose()
  @IsOptional()
  @IsString()
  eligibility_text?: string | null;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @Expose()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @Expose()
  @IsOptional()
  @IsIn(VALID_ROLE_SLUGS)
  promotes_to_role?: string | null;
}
