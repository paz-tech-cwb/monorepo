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
import { JourneyTrackStep } from './journey-track-step.entity';

export type MemberJourneyStepProgressSource =
  | 'course_completion'
  | 'manual_approval'
  | 'legacy_import';

@Entity('member_journey_step_progress')
export class MemberJourneyStepProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'member_id', type: 'int' })
  memberId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: User;

  @Column({ name: 'step_id', type: 'int' })
  stepId: number;

  @ManyToOne(() => JourneyTrackStep, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'step_id' })
  step: JourneyTrackStep;

  @Column({ name: 'completed_at', type: 'timestamp' })
  completedAt: Date;

  @Column({ type: 'varchar', length: 20 })
  source: MemberJourneyStepProgressSource;

  @Column({ name: 'completed_by_user_id', type: 'int', nullable: true })
  completedByUserId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'completed_by_user_id' })
  completedByUser: User | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
