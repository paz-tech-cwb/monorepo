import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Church } from '../../church/entities/church.entity';

@Entity('casa_de_paz_cycles')
export class CasaDePazCycle {
  @PrimaryGeneratedColumn('uuid') id: string;

  // Scoped per-filial: the global UNIQUE on `month` became a composite
  // UNIQUE (church_id, month) in migration 1795900000005, so two filiais can
  // each open their own cycle for the same calendar month.
  @ManyToOne(() => Church, { nullable: false })
  @JoinColumn({ name: 'church_id' })
  church: Church;

  @Column({ type: 'date' }) month: string;
  @Column({ type: 'varchar', length: 120 }) name: string;
  @Column({ type: 'varchar', length: 10, default: 'open' }) status: string;
  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null;
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
