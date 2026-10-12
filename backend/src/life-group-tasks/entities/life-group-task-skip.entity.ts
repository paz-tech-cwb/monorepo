import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LifeGroup } from '../../life-groups/entities/life-group.entity';

// A skipped meeting date: no tasks are generated and the date is excluded
// from fairness history.
@Entity('life_group_task_skips')
@Index(['lifeGroupId', 'meetingDate'], { unique: true })
export class LifeGroupTaskSkip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'life_group_id', type: 'int' })
  lifeGroupId: number;

  @ManyToOne(() => LifeGroup, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'life_group_id' })
  lifeGroup: LifeGroup;

  @Column({ name: 'meeting_date', type: 'date' })
  meetingDate: string;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
