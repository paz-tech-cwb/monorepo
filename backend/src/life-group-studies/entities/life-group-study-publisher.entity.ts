import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('life_group_study_publishers')
export class LifeGroupStudyPublisher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false, eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', unique: true })
  userId: number;

  @ManyToOne(() => User, { nullable: false, eager: false })
  @JoinColumn({ name: 'granted_by_id' })
  grantedBy: User;

  @Column({ name: 'granted_by_id' })
  grantedById: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
