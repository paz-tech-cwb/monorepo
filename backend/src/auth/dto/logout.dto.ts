import { Expose, Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @Expose()
  @Transform(({ obj }) => obj.refresh_token)
  @IsString({ message: 'Refresh token must be a string.' })
  @IsNotEmpty({ message: 'Refresh token must not be empty.' })
  refreshToken: string;

  @Expose()
  @Transform(({ obj }) => obj.fcm_token)
  @IsOptional()
  @IsString()
  fcmToken?: string;
}
