import {
  Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne,
  PrimaryGeneratedColumn, RelationId, UpdateDateColumn,
} from 'typeorm';
import { Expose, Type } from 'class-transformer';
import { User } from '../../users/entities/user.entity';
import { Ministry } from './ministry.entity';

@Entity('ministry_teams')
export class MinistryTeam {
  @Expose() @PrimaryGeneratedColumn() id: number;
  @Expose() @Column({ type: 'varchar', length: 180 }) name: string;
  @Expose() @Type(() => Ministry)
  @ManyToOne(() => Ministry, (m) => m.teams, { nullable: false })
  @JoinColumn({ name: 'ministry_id' })
  ministry: Ministry;
  @Expose() @RelationId((t: MinistryTeam) => t.ministry) ministryId: number;
  @Expose() @Type(() => User)
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'leader_id' })
  leader: User | null;
  @Expose() @Type(() => User)
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'co_leader_id' })
  coLeader: User | null;
  @Expose() @Type(() => User)
  @ManyToMany(() => User)
  @JoinTable({
    name: 'ministry_team_members',
    joinColumn: { name: 'team_id' },
    inverseJoinColumn: { name: 'user_id' },
  })
  members: User[];
  @Expose() @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @Expose() @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
