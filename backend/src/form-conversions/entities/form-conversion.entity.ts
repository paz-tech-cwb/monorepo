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

@Entity('form_conversions')
export class FormConversion {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'full_name', type: 'varchar', length: 180 }) fullName: string;
  @Column({ type: 'varchar', length: 180 }) email: string;
  @Column({ type: 'varchar', length: 32 }) phone: string;
  @Column({ name: 'decision_type', type: 'varchar', length: 20 })
  decisionType: string;
  @Column({ name: 'how_met_church', type: 'varchar', length: 40 })
  howMetChurch: string;
  @Column({
    name: 'how_met_church_other',
    type: 'varchar',
    length: 180,
    nullable: true,
  })
  howMetChurchOther: string | null;
  @Column({ type: 'varchar', length: 2 }) gender: string;
  @Column({ name: 'birth_date', type: 'date' }) birthDate: string;
  @Column({ name: 'civil_state', type: 'varchar', length: 20 })
  civilState: string;
  @Column({ type: 'varchar', length: 9, nullable: true }) cep: string | null;
  @Column({ type: 'varchar', length: 180, nullable: true }) street:
    | string
    | null;
  @Column({
    name: 'address_number',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  addressNumber: string | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) complement:
    | string
    | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) neighborhood:
    | string
    | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) city: string | null;
  @Column({ type: 'varchar', length: 2, nullable: true }) state: string | null;
  @Column({ type: 'text' }) address: string;
  @Column({ name: 'attendance_count', type: 'varchar', length: 40 })
  attendanceCount: string;
  @Column({ name: 'life_group_status', type: 'varchar', length: 40 })
  lifeGroupStatus: string;
  @Column({
    name: 'life_group_leader_or_name',
    type: 'varchar',
    length: 180,
    nullable: true,
  })
  lifeGroupLeaderOrName: string | null;
  @Column({ name: 'invited_by', type: 'varchar', length: 180, nullable: true })
  invitedBy: string | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
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
