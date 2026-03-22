import { IsIn, IsString, IsNotEmpty } from 'class-validator';
import { Expose } from 'class-transformer';

export class RegisterDeviceTokenDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  token: string;

  @Expose()
  @IsIn(['android', 'ios'])
  platform: 'android' | 'ios';
}
