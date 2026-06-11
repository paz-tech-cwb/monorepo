import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type NotificationCategory =
  | 'events'
  | 'announcements'
  | 'life_group'
  | 'academy'
  | 'admin_alerts'
  | 'forms'
  | 'member_journey'
  | 'contributions'
  | 'meeting_reports';

export type NotificationStatus =
  | 'pending'
  | 'processing'
  | 'scheduled'
  | 'sent'
  | 'failed';

export interface NotificationSegment {
  type: 'all' | 'filtered';
  filters?: {
    roles?: string[];
    sector_ids?: number[];
    life_group_ids?: number[];
    status?: 'active' | 'inactive';
  };
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: ['events', 'announcements', 'life_group', 'academy', 'admin_alerts', 'forms', 'member_journey', 'contributions', 'meeting_reports'],
    enumName: 'notification_category_enum',
  })
  category: NotificationCategory;

  @Column({ type: 'jsonb' })
  channels: string[];

  @Column({ type: 'jsonb' })
  segment: NotificationSegment;

  @Column({ name: 'recipients_count', type: 'int', default: 0 })
  recipientsCount: number;

  @Column({ name: 'recipients_by_channel', type: 'jsonb', nullable: true })
  recipientsByChannel: Record<string, number> | null;

  @Column({
    type: 'enum',
    enum: ['pending', 'processing', 'scheduled', 'sent', 'failed'],
    enumName: 'notification_status_enum',
    default: 'pending',
  })
  status: NotificationStatus;

  @Column({ name: 'scheduled_at', type: 'timestamp', nullable: true })
  scheduledAt: Date | null;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
