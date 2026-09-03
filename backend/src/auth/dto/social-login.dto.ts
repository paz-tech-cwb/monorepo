import { Expose, Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

interface RawSocialLoginBody {
  id_token?: unknown;
}

export class SocialLoginDto {
  @Expose()
  @IsString({ message: 'Provider must be a string.' })
  @IsIn(['google', 'apple'], {
    message: 'Provider must be either "google" or "apple".',
  })
  provider: string;

  @Expose()
  @Transform(({ obj }: { obj: RawSocialLoginBody }) => obj.id_token)
  @IsString({ message: 'ID token must be a string.' })
  @IsNotEmpty({ message: 'ID token must not be empty.' })
  idToken: string;

  // Firebase tokens never carry birth date. Clients that have already
  // collected it (e.g. during onboarding) may pass it along so the backend
  // can identity-match by name + birth date instead of email alone.
  @Expose({ name: 'birth_date' })
  @IsOptional()
  @IsDateString({}, { message: 'birth_date must be a valid date string.' })
  birthDate?: string;
}
