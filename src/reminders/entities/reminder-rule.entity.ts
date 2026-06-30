import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  ReminderConfig,
  ReminderRuleType,
} from '../types/reminder-config';

@Entity('reminder_rules')
export class ReminderRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ['form_report', 'event', 'member_journey'],
    enumName: 'reminder_rule_type_enum',
    unique: true,
  })
  type: ReminderRuleType;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  @Column({ type: 'jsonb', default: '{}' })
  config: ReminderConfig;

  @Column({ name: 'last_run_at', type: 'timestamp', nullable: true })
  lastRunAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
