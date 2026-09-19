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

@Entity('casa_de_paz_reports')
export class CasaDePazReport {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'date' }) date: string;
  @Column({ type: 'varchar', length: 180 }) facilitator: string;
  @Column({ name: 'sector_id', type: 'int' }) sectorId: number;
  @Column({ type: 'int', default: 0 }) adults: number;
  @Column({ type: 'int', default: 0 }) kids: number;
  @Column({ type: 'int', default: 0 }) guests: number;
  @Column({ type: 'int', default: 0 }) conversions: number;
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
  @ManyToOne(() => User, { nullable: false }) submittedBy: User;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @DeleteDateColumn({ name: 'deleted_at' }) deletedAt: Date | null;
}
