import { Column, CreateDateColumn, DeleteDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('service_reports')
export class ServiceReport {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'date' }) date: string;
  @Column({ name: 'service_type', type: 'varchar', length: 40 }) serviceType: string;
  @Column({ name: 'service_type_other', type: 'varchar', length: 180, nullable: true }) serviceTypeOther: string | null;
  @Column({ name: 'total_attendance', type: 'int' }) totalAttendance: number;
  @Column({ name: 'members_present', type: 'int' }) membersPresent: number;
  @Column({ name: 'guests_present', type: 'int' }) guestsPresent: number;
  @Column({ name: 'kids_present', type: 'int' }) kidsPresent: number;
  @Column({ name: 'decisions_for_christ', type: 'int' }) decisionsForChrist: number;
  @Column({ type: 'int' }) reconciliations: number;
  @Column({ name: 'baptism_candidates', type: 'int', nullable: true }) baptismCandidates: number | null;
  @Column({ type: 'numeric', precision: 10, scale: 2 }) offering: string;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ name: 'area_id', type: 'int', nullable: true }) areaId: number | null;
  @Column({ name: 'sector_id', type: 'int', nullable: true }) sectorId: number | null;
  @Column({ name: 'life_group_id', type: 'int', nullable: true }) lifeGroupId: number | null;
  @ManyToOne(() => User, { nullable: false }) submittedBy: User;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @DeleteDateColumn({ name: 'deleted_at' }) deletedAt: Date | null;
}
