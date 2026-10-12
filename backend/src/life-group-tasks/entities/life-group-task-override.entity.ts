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
import { LifeGroupTaskTemplate } from './life-group-task-template.entity';

@Entity('life_group_task_overrides')
@Index(['lifeGroupId', 'templateId'], { unique: true })
export class LifeGroupTaskOverride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'life_group_id', type: 'int' })
  lifeGroupId: number;

  @ManyToOne(() => LifeGroup, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'life_group_id' })
  lifeGroup: LifeGroup;

  @Column({ name: 'template_id', type: 'int' })
  templateId: number;

  @ManyToOne(() => LifeGroupTaskTemplate, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template: LifeGroupTaskTemplate;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  @Column({ name: 'guidance_override', type: 'text', nullable: true })
  guidanceOverride: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
