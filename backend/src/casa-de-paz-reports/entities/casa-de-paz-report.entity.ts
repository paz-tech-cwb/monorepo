import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CasaDePazCycle } from '../../casa-de-paz-cycles/entities/casa-de-paz-cycle.entity';
import { CasaDePazReportGuest } from './casa-de-paz-report-guest.entity';

@Entity('casa_de_paz_reports')
export class CasaDePazReport {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'date' }) date: string;
  @Column({ type: 'varchar', length: 180 }) facilitator: string;
  @Column({ name: 'sector_id', type: 'int' }) sectorId: number;
  @Column({ name: 'casa_de_paz_id', type: 'uuid' }) casaDePazId: string;
  @ManyToOne(() => CasaDePazCycle, { nullable: false })
  @JoinColumn({ name: 'casa_de_paz_id' })
  casaDePazCycle: CasaDePazCycle;
  @Column({ type: 'int', default: 0 }) kids: number;
  @Column({ type: 'int', default: 0 }) conversions: number;
  @OneToMany(() => CasaDePazReportGuest, (g) => g.report, { cascade: true })
  guests: CasaDePazReportGuest[];
  @Column({ name: 'week_number', type: 'int', nullable: true })
  weekNumber: number | null;
  @Column({
    name: 'meeting_day',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  meetingDay: string | null;
  @Column({
    name: 'meeting_time',
    type: 'varchar',
    length: 5,
    nullable: true,
  })
  meetingTime: string | null;
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'submitted_by_id' })
  submittedBy: User;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @DeleteDateColumn({ name: 'deleted_at' }) deletedAt: Date | null;
}
