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

@Entity('form_guests')
export class FormGuest {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'full_name', type: 'varchar', length: 180 }) fullName: string;
  @Column({ type: 'varchar', length: 32, nullable: true }) phone: string | null;
  @Column({ type: 'varchar', length: 180, nullable: true }) email:
    | string
    | null;
  @Column({ type: 'date', nullable: true }) date: string | null;
  @Column({ name: 'created_user_id', type: 'int', nullable: true })
  createdUserId: number | null;
  @Column({ type: 'text', nullable: true }) address: string | null;
  @Column({ name: 'invited_by', type: 'varchar', length: 180, nullable: true })
  invitedBy: string | null;
  @Column({ name: 'how_met_church', type: 'text', nullable: true })
  howMetChurch: string | null;
  @Column({ name: 'filled_by', type: 'varchar', length: 180, nullable: true })
  filledBy: string | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ name: 'via_casa_de_paz', type: 'boolean', default: false })
  viaCasaDePaz: boolean;
  @Column({ name: 'area_id', type: 'int', nullable: true }) areaId:
    | number
    | null;
  @Column({ name: 'sector_id', type: 'int', nullable: true }) sectorId:
    | number
    | null;
  @Column({ name: 'life_group_id', type: 'int', nullable: true }) lifeGroupId:
    | number
    | null;
  @ManyToOne(() => User, { nullable: false }) submittedBy: User;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @DeleteDateColumn({ name: 'deleted_at' }) deletedAt: Date | null;
}
