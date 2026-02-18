import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class SocialLoginDto {
  @IsString({ message: 'Provider must be a string.' })
  @IsIn(['google', 'apple'], {
    message: 'Provider must be either "google" or "apple".',
  })
  provider: string;

  @IsString({ message: 'ID token must be a string.' })
  @IsNotEmpty({ message: 'ID token must not be empty.' })
  idToken: string;
}
