import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Church } from './church.entity';

// Join table modeling the many-to-many relationship between users and
// churches (filiais). A user may belong to more than one filial; exactly one
// association per user is expected to carry `isPrimary = true` (enforced at
// the service layer, not a DB constraint) — this is the user's "home" filial,
// used to scope org-tree reads (areas/events/announcements/casa-de-paz
// cycles) and surfaced via the JWT/`/users/me` payload as `church_id`.
@Entity('user_churches')
export class UserChurch {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Church, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'church_id' })
  church: Church;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
