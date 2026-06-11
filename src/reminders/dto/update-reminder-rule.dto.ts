import { IsBoolean, IsObject, IsOptional } from 'class-validator';
import type { ReminderConfig } from '../types/reminder-config';

export class UpdateReminderRuleDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  config?: ReminderConfig;
}
