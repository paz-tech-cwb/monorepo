import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Church } from '../../church/entities/church.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Church, { nullable: false })
  @JoinColumn({ name: 'church_id' })
  church: Church;

  @Column()
  title: string;

  @Column({ name: 'initial_date', type: 'timestamp' })
  initialDate: Date;

  @Column({ name: 'final_date', type: 'timestamp', nullable: true })
  finalDate: Date | null;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @Column({ name: 'recurrence_type', type: 'varchar', nullable: true })
  recurrenceType: string | null;

  @Column({ name: 'image_url', type: 'varchar', nullable: true })
  imageUrl: string | null;

  @CreateDateColumn({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
