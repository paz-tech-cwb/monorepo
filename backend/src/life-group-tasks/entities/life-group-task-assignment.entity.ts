import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LifeGroup } from '../../life-groups/entities/life-group.entity';
import { User } from '../../users/entities/user.entity';
import { LifeGroupTaskTemplate } from './life-group-task-template.entity';

export type LifeGroupTaskStatus = 'assigned' | 'declined' | 'completed';
export type LifeGroupTaskSource = 'auto' | 'manual' | 'reroll';

// task_* columns are snapshots taken at assignment time so later template
// edits do not rewrite history; the guidance snapshot already applies the
// group's guidance override.
@Entity('life_group_task_assignments')
@Index(['lifeGroupId', 'templateId', 'meetingDate'], { unique: true })
@Index(['userId', 'meetingDate'])
@Index(['lifeGroupId', 'meetingDate'])
export class LifeGroupTaskAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'life_group_id', type: 'int' })
  lifeGroupId: number;

  @ManyToOne(() => LifeGroup, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'life_group_id' })
  lifeGroup: LifeGroup;

  @Column({ name: 'template_id', type: 'int' })
  templateId: number;

  @ManyToOne(() => LifeGroupTaskTemplate, { nullable: false })
  @JoinColumn({ name: 'template_id' })
  template: LifeGroupTaskTemplate;

  @Column({ name: 'meeting_date', type: 'date' })
  meetingDate: string;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'task_name', type: 'varchar', length: 150 })
  taskName: string;

  @Column({ name: 'task_description', type: 'text', default: '' })
  taskDescription: string;

  @Column({ name: 'task_guidance', type: 'text', default: '' })
  taskGuidance: string;

  @Column({ type: 'varchar', length: 20, default: 'assigned' })
  status: LifeGroupTaskStatus;

  @Column({ type: 'varchar', length: 20, default: 'auto' })
  source: LifeGroupTaskSource;

  @Column({ name: 'notified_at', type: 'timestamptz', nullable: true })
  notifiedAt: Date | null;

  @Column({ name: 'reminded_at', type: 'timestamptz', nullable: true })
  remindedAt: Date | null;

  // Everyone who declined this (group, template, date) task, oldest first.
  // Re-rolls and later declines never pick them again.
  @Column({
    name: 'declined_user_ids',
    type: 'int',
    array: true,
    default: () => "'{}'",
  })
  declinedUserIds: number[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
