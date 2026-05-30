import { Column, CreateDateColumn, DeleteDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('area_supervisor_reports')
export class AreaSupervisorReport {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'date' }) date: string;
  @Column({ name: 'area_id', type: 'int' }) areaId: number;
  @Column({ name: 'sectors_visited', type: 'int', array: true, default: () => "'{}'" }) sectorsVisited: number[];
  @Column({ name: 'sector_leaders_pastored', type: 'int', array: true, default: () => "'{}'" }) sectorLeadersPastored: number[];
  @Column({ name: 'meetings_held', type: 'int' }) meetingsHeld: number;
  @Column({ name: 'trainings_conducted', type: 'int' }) trainingsConducted: number;
  @Column({ name: 'multiplications_in_progress', type: 'int', nullable: true }) multiplicationsInProgress: number | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @ManyToOne(() => User, { nullable: false }) submittedBy: User;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @DeleteDateColumn({ name: 'deleted_at' }) deletedAt: Date | null;
}
