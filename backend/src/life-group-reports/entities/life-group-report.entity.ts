import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { LifeGroupAttendance } from '../../life-group-attendance/entities/life-group-attendance.entity';

// DB-only constraints (migration 1796000000000, deliberately NOT declared with
// @Index so `synchronize` never tries to create/drop them on a database that
// still has duplicates): partial UNIQUE index
// `uq_life_group_reports_group_date_active` on (life_group_id, date) WHERE
// deleted_at IS NULL (created only when no duplicates exist; application code
// guards duplicates itself), and index `idx_lgr_attendance` on attendance_id.
@Entity('life_group_reports')
export class LifeGroupReport {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'date' }) date: string;
  @Column({ name: 'area_id', type: 'int' }) areaId: number;
  @Column({ name: 'sector_id', type: 'int' }) sectorId: number;
  @Column({ name: 'life_group_id', type: 'int' }) lifeGroupId: number;
  @Column({ name: 'committed_members', type: 'int' }) committedMembers: number;
  @Column({ name: 'committed_members_present', type: 'int' })
  committedMembersPresent: number;
  @Column({ name: 'kids_0_to_11', type: 'int' }) kids0To11: number;
  @Column({ type: 'int' }) guests: number;
  @Column({ type: 'int' }) mdas: number;
  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  offering: string;
  @Column({ name: 'committed_at_tadel', type: 'int' }) committedAtTadel: number;
  @Column({ name: 'committed_at_culto', type: 'int' }) committedAtCulto: number;
  @Column({
    name: 'leader_attended',
    type: 'text',
    array: true,
    default: () => "'{}'",
  })
  leaderAttended: string[];
  @Column({ name: 'disciples_count', type: 'int' }) disciplesCount: number;
  @Column({ name: 'disciples_discipled_this_week', type: 'int' })
  disciplesDiscipledThisWeek: number;
  @Column({
    name: 'pastoring_activity_type',
    type: 'text',
    array: true,
    default: [],
  })
  pastoringActivityType: string[];
  @Column({
    name: 'pastoring_activity_other',
    type: 'varchar',
    length: 180,
    nullable: true,
  })
  pastoringActivityOther: string | null;
  @Column({
    name: 'training_activity_type',
    type: 'text',
    array: true,
    default: [],
  })
  trainingActivityType: string[];
  @Column({
    name: 'training_activity_other',
    type: 'varchar',
    length: 180,
    nullable: true,
  })
  trainingActivityOther: string | null;
  // Link to the attendance record of the same meeting (combined meetings
  // flow). Write through the scalar `attendanceId`; `attendance` is for
  // reads/joins only. NULL for legacy reports and standalone reports.
  @Column({ name: 'attendance_id', type: 'uuid', nullable: true })
  attendanceId: string | null;
  @ManyToOne(() => LifeGroupAttendance, {
    nullable: true,
    onDelete: 'SET NULL',
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'attendance_id' })
  attendance?: LifeGroupAttendance | null;
  @ManyToOne(() => User, { nullable: false }) submittedBy: User;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @DeleteDateColumn({ name: 'deleted_at' }) deletedAt: Date | null;
}
