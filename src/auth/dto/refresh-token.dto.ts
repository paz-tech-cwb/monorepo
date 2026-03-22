import { Expose, Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @Expose()
  @Transform(({ obj }) => obj.refresh_token)
  @IsString({ message: 'Refresh token must be a string.' })
  @IsNotEmpty({ message: 'Refresh token must not be empty.' })
  refreshToken: string;
}
