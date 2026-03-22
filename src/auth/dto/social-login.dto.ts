import { Expose, Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class SocialLoginDto {
  @Expose()
  @IsString({ message: 'Provider must be a string.' })
  @IsIn(['google', 'apple'], {
    message: 'Provider must be either "google" or "apple".',
  })
  provider: string;

  @Expose()
  @Transform(({ obj }) => obj.id_token)
  @IsString({ message: 'ID token must be a string.' })
  @IsNotEmpty({ message: 'ID token must not be empty.' })
  idToken: string;
}
