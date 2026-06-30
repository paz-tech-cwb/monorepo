import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('sector_supervisor_reports')
export class SectorSupervisorReport {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'date' }) date: string;
  @Column({ name: 'sector_id', type: 'int' }) sectorId: number;
  @Column({ name: 'area_id', type: 'int', nullable: true }) areaId:
    | number
    | null;
  @Column({
    name: 'life_groups_visited',
    type: 'int',
    array: true,
    default: () => "'{}'",
  })
  lifeGroupsVisited: number[];
  @Column({
    name: 'leaders_pastored',
    type: 'int',
    array: true,
    default: () => "'{}'",
  })
  leadersPastored: number[];
  @Column({
    name: 'multiplication_candidates',
    type: 'int',
    array: true,
    default: () => "'{}'",
  })
  multiplicationCandidates: number[];
  @Column({ name: 'life_groups_count', type: 'int', default: 0 })
  lifeGroupsCount: number;
  @Column({ name: 'life_groups_supervised', type: 'int', default: 0 })
  lifeGroupsSupervised: number;
  @Column({
    name: 'life_group_observations',
    type: 'text',
    array: true,
    default: [],
  })
  lifeGroupObservations: string[];
  @Column({ name: 'sector_multiplication_date', type: 'date', nullable: true })
  sectorMultiplicationDate: string | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @ManyToOne(() => User, { nullable: false }) submittedBy: User;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @DeleteDateColumn({ name: 'deleted_at' }) deletedAt: Date | null;
}
