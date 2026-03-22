import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_notification_preferences')
export class UserNotificationPreferences {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'all_notifications_enabled', type: 'boolean', default: true })
  allNotificationsEnabled: boolean;

  @Column({ name: 'push_enabled', type: 'boolean', default: true })
  pushEnabled: boolean;

  @Column({ name: 'email_enabled', type: 'boolean', default: true })
  emailEnabled: boolean;

  @Column({ name: 'sms_enabled', type: 'boolean', default: true })
  smsEnabled: boolean;

  @Column({ name: 'whatsapp_enabled', type: 'boolean', default: true })
  whatsappEnabled: boolean;

  @Column({ name: 'events_enabled', type: 'boolean', default: true })
  eventsEnabled: boolean;

  @Column({ name: 'announcements_enabled', type: 'boolean', default: true })
  announcementsEnabled: boolean;

  @Column({ name: 'life_group_enabled', type: 'boolean', default: true })
  lifeGroupEnabled: boolean;

  @Column({ name: 'academy_enabled', type: 'boolean', default: true })
  academyEnabled: boolean;

  @Column({ name: 'admin_alerts_enabled', type: 'boolean', default: true })
  adminAlertsEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
