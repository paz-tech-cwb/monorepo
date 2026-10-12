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

/**
 * System note written by the 1795900000004 migration on the explicit
 * eligible=true rows that grandfather existing members. It is never shown to
 * leaders; the API exposes a `grandfathered` flag instead.
 */
export const GRANDFATHERED_REASON = 'grandfathered at migration';

// Explicit per-member setting; always wins over the automatic eligibility
// rule. `reason` is a leader-only note and must never reach member endpoints.
@Entity('life_group_task_member_settings')
@Index(['lifeGroupId', 'userId'], { unique: true })
export class LifeGroupTaskMemberSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'life_group_id', type: 'int' })
  lifeGroupId: number;

  @ManyToOne(() => LifeGroup, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'life_group_id' })
  lifeGroup: LifeGroup;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'boolean', default: true })
  eligible: boolean;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({
    name: 'excluded_template_ids',
    type: 'int',
    array: true,
    nullable: true,
  })
  excludedTemplateIds: number[] | null;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
