import { Column, CreateDateColumn, DeleteDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('life_group_reports')
export class LifeGroupReport {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'date' }) date: string;
  @Column({ name: 'area_id', type: 'int' }) areaId: number;
  @Column({ name: 'sector_id', type: 'int' }) sectorId: number;
  @Column({ name: 'life_group_id', type: 'int' }) lifeGroupId: number;
  @Column({ name: 'committed_members', type: 'int' }) committedMembers: number;
  @Column({ name: 'committed_members_present', type: 'int' }) committedMembersPresent: number;
  @Column({ name: 'kids_0_to_11', type: 'int' }) kids0To11: number;
  @Column({ type: 'int' }) guests: number;
  @Column({ type: 'int' }) mdas: number;
  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 }) offering: string;
  @Column({ name: 'committed_at_tadel', type: 'int' }) committedAtTadel: number;
  @Column({ name: 'committed_at_culto', type: 'int' }) committedAtCulto: number;
  @Column({ name: 'leader_attended', type: 'text', array: true, default: () => "'{}'" }) leaderAttended: string[];
  @Column({ name: 'disciples_count', type: 'int' }) disciplesCount: number;
  @Column({ name: 'disciples_discipled_this_week', type: 'int' }) disciplesDiscipledThisWeek: number;
  @Column({ name: 'pastoring_activity_type', type: 'varchar', length: 40 }) pastoringActivityType: string;
  @Column({ name: 'pastoring_activity_other', type: 'varchar', length: 180, nullable: true }) pastoringActivityOther: string | null;
  @Column({ name: 'pastoring_activity_objective', type: 'text', nullable: true }) pastoringActivityObjective: string | null;
  @Column({ name: 'training_activity_type', type: 'varchar', length: 40 }) trainingActivityType: string;
  @Column({ name: 'training_activity_other', type: 'varchar', length: 180, nullable: true }) trainingActivityOther: string | null;
  @ManyToOne(() => User, { nullable: false }) submittedBy: User;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @DeleteDateColumn({ name: 'deleted_at' }) deletedAt: Date | null;
}
