import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { ReminderRuleType } from '../types/reminder-config';

@Entity('reminder_dispatch_log')
@Index(['ruleType', 'dedupeKey'], { unique: true })
export class ReminderDispatchLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'rule_type', type: 'varchar', length: 32 })
  ruleType: ReminderRuleType;

  @Column({ name: 'dedupe_key', type: 'varchar', length: 255 })
  dedupeKey: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
