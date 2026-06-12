import { IsBoolean, IsObject, IsOptional } from 'class-validator';
import { Expose } from 'class-transformer';
import type { ReminderConfig } from '../types/reminder-config';

export class UpdateReminderRuleDto {
  @Expose()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @Expose()
  @IsOptional()
  @IsObject()
  config?: ReminderConfig;
}
