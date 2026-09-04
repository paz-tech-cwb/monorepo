import { Expose } from 'class-transformer';
import { IsInt } from 'class-validator';

export class GrantPublisherDto {
  @Expose({ name: 'user_id' })
  @IsInt()
  userId: number;
}
