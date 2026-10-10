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
import { Church } from '../../church/entities/church.entity';

@Entity('areas')
export class Area {
  @PrimaryGeneratedColumn()
  id: number;

  // Areas are the root of the org tree (Area -> Sector -> LifeGroup); every
  // org-tree query is scoped by this FK, so Sector/LifeGroup don't need their
  // own church_id.
  @ManyToOne(() => Church, { nullable: false })
  @JoinColumn({ name: 'church_id' })
  church: Church;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'leader_id' })
  leader: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'co_leader_id' })
  coLeader: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'pastor_id' })
  pastor: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'co_pastor_id' })
  coPastor: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
