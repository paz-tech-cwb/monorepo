import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CasaDePazCycle } from '../../casa-de-paz-cycles/entities/casa-de-paz-cycle.entity';

export type GuestOriginType = 'casa_de_paz' | 'invited_by_member' | 'self';

@Entity('guest_origins')
export class GuestOrigin {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'user_id', type: 'int', unique: true })
  userId: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'origin_type', type: 'varchar', length: 20 })
  originType: GuestOriginType;

  @Column({ name: 'casa_de_paz_id', type: 'uuid', nullable: true })
  casaDePazId: string | null;

  @ManyToOne(() => CasaDePazCycle, { nullable: true })
  @JoinColumn({ name: 'casa_de_paz_id' })
  casaDePazCycle: CasaDePazCycle | null;

  @Column({ name: 'invited_by_user_id', type: 'int', nullable: true })
  invitedByUserId: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'invited_by_user_id' })
  invitedByUser: User | null;

  @Column({
    name: 'invited_by_text',
    type: 'varchar',
    length: 180,
    nullable: true,
  })
  invitedByText: string | null;

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
