import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CasaDePazReport } from './casa-de-paz-report.entity';
import { User } from '../../users/entities/user.entity';

@Entity('casa_de_paz_report_guests')
export class CasaDePazReportGuest {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'report_id', type: 'uuid' })
  reportId: string;

  @ManyToOne(() => CasaDePazReport, (report) => report.guests, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'report_id' })
  report: CasaDePazReport;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ type: 'varchar', length: 180 }) name: string;
  @Column({ type: 'varchar', length: 180 }) email: string;
  @Column({ name: 'birth_date', type: 'date' }) birthDate: string;
  @Column({ type: 'varchar', length: 32, nullable: true }) whatsapp:
    | string
    | null;

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
