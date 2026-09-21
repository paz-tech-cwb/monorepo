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
import { JourneyTrack } from './journey-track.entity';
import { Course } from '../../courses/entities/course.entity';

export type JourneyTrackStepType =
  | 'course_completion'
  | 'manual_approval'
  | 'informational';

@Entity('journey_track_steps')
@Index(['trackId', 'sortOrder'])
export class JourneyTrackStep {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'track_id', type: 'int' })
  trackId: number;

  @ManyToOne(() => JourneyTrack, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'track_id' })
  track: JourneyTrack;

  // Stable, migration-time key used to match steps when seeding/importing
  // legacy data. Not member-facing.
  @Column({ type: 'varchar', length: 60, nullable: true })
  key: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'varchar', length: 30 })
  type: JourneyTrackStepType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index()
  @Column({ name: 'course_id', type: 'uuid', nullable: true })
  courseId: string | null;

  @ManyToOne(() => Course, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'course_id' })
  course: Course | null;

  @Column({
    name: 'external_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  externalUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
