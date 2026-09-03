import { Expose, Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

interface RawRefreshTokenBody {
  refresh_token?: unknown;
}

export class RefreshTokenDto {
  @Expose()
  @Transform(({ obj }: { obj: RawRefreshTokenBody }) => obj.refresh_token)
  @IsString({ message: 'Refresh token must be a string.' })
  @IsNotEmpty({ message: 'Refresh token must not be empty.' })
  refreshToken: string;
}
