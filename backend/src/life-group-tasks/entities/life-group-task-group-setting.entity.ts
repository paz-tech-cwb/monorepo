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

export const DEFAULT_MIN_PRESENT_MEETINGS = 3;

@Entity('life_group_task_group_settings')
@Index(['lifeGroupId'], { unique: true })
export class LifeGroupTaskGroupSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'life_group_id', type: 'int' })
  lifeGroupId: number;

  @ManyToOne(() => LifeGroup, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'life_group_id' })
  lifeGroup: LifeGroup;

  @Column({
    name: 'min_present_meetings',
    type: 'int',
    default: DEFAULT_MIN_PRESENT_MEETINGS,
  })
  minPresentMeetings: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
