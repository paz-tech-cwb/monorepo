import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Expose, Type } from 'class-transformer';
import { User } from '../../users/entities/user.entity';
import { MinistryTeam } from './ministry-team.entity';

export type MembershipMode = 'teams' | 'direct';

@Entity('ministries')
export class Ministry {
  @Expose() @PrimaryGeneratedColumn() id: number;
  @Expose() @Column({ type: 'varchar', length: 180 }) name: string;
  @Expose()
  @Column({ type: 'varchar', length: 80, nullable: true, unique: true })
  slug: string | null;
  @Expose({ name: 'is_permanent' })
  @Column({ name: 'is_permanent', type: 'boolean', default: false })
  isPermanent: boolean;
  @Expose() @Column({ type: 'text', nullable: true }) description:
    | string
    | null;
  @Expose({ name: 'membership_mode' })
  @Column({
    name: 'membership_mode',
    type: 'varchar',
    length: 16,
    default: 'teams',
  })
  membershipMode: MembershipMode;
  @Expose()
  @Type(() => User)
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'leader_id' })
  leader: User | null;
  @Expose({ name: 'co_leader' })
  @Type(() => User)
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'co_leader_id' })
  coLeader: User | null;
  @Expose()
  @Type(() => MinistryTeam)
  @OneToMany(() => MinistryTeam, (t) => t.ministry)
  teams: MinistryTeam[];
  @Expose()
  @Type(() => User)
  @ManyToMany(() => User)
  @JoinTable({
    name: 'ministry_members',
    joinColumn: { name: 'ministry_id' },
    inverseJoinColumn: { name: 'user_id' },
  })
  members: User[];
  @Expose({ name: 'created_at' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  @Expose({ name: 'updated_at' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
