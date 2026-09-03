import { Expose, Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

interface RawLogoutBody {
  refresh_token?: unknown;
  fcm_token?: unknown;
}

export class LogoutDto {
  @Expose()
  @Transform(({ obj }: { obj: RawLogoutBody }) => obj.refresh_token)
  @IsString({ message: 'Refresh token must be a string.' })
  @IsNotEmpty({ message: 'Refresh token must not be empty.' })
  refreshToken: string;

  @Expose()
  @Transform(({ obj }: { obj: RawLogoutBody }) => obj.fcm_token)
  @IsOptional()
  @IsString()
  fcmToken?: string;
}
