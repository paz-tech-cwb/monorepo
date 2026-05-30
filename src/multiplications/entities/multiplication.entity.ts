import { Column, CreateDateColumn, DeleteDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('multiplications')
export class Multiplication {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'date' }) date: string;
  @Column({ name: 'source_life_group_id', type: 'int' }) sourceLifeGroupId: number;
  @Column({ name: 'area_id', type: 'int' }) areaId: number;
  @Column({ name: 'sector_id', type: 'int' }) sectorId: number;
  @Column({ name: 'completed_leadership_track', type: 'boolean' }) completedLeadershipTrack: boolean;
  @Column({ name: 'legally_married', type: 'boolean' }) legallyMarried: boolean;
  @Column({ name: 'faithful_tither', type: 'boolean' }) faithfulTither: boolean;
  @Column({ name: 'evangelizing_and_consolidating', type: 'boolean' }) evangelizingAndConsolidating: boolean;
  @Column({ name: 'good_testimony', type: 'boolean' }) goodTestimony: boolean;
  @Column({ name: 'single_living_in_purity', type: 'boolean', nullable: true }) singleLivingInPurity: boolean | null;
  @Column({ name: 'new_life_group_id', type: 'int', nullable: true }) newLifeGroupId: number | null;
  @Column({ name: 'new_life_group_name', type: 'varchar', length: 180 }) newLifeGroupName: string;
  @Column({ name: 'new_leader_id', type: 'int' }) newLeaderId: number;
  @Column({ name: 'host_id', type: 'int' }) hostId: number;
  @Column({ type: 'text' }) address: string;
  @Column({ name: 'leader_phone', type: 'varchar', length: 32 }) leaderPhone: string;
  @Column({ name: 'meeting_day_time', type: 'timestamptz' }) meetingDayTime: Date;
  @Column({ name: 'members_to_move', type: 'int', array: true, default: () => "'{}'" }) membersToMove: number[];
  @Column({ name: 'new_members', type: 'int', array: true, default: () => "'{}'" }) newMembers: number[];
  @ManyToOne(() => User, { nullable: false }) submittedBy: User;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @DeleteDateColumn({ name: 'deleted_at' }) deletedAt: Date | null;
}
