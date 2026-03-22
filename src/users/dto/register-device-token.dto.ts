import { IsIn, IsString, IsNotEmpty } from 'class-validator';
import { Expose } from 'class-transformer';
import { DevicePlatform } from '../entities/user-device-token.entity';

export class RegisterDeviceTokenDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  token: string;

  @Expose()
  @IsIn(['android', 'ios'])
  platform: DevicePlatform;
}
