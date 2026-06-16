import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { MinistryTeam } from '../../ministries/entities/ministry-team.entity';

@Entity('service_reports')
export class ServiceReport {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'date' }) date: string;
  @Column({ name: 'report_type', type: 'varchar', length: 30 })
  reportType: string;
  @Column({ type: 'varchar', length: 20 }) period: string;
  @Column({ name: 'atmosphere_team_id', type: 'int', nullable: true })
  atmosphereTeamId: number | null;
  @ManyToOne(() => MinistryTeam, { nullable: true, eager: false })
  @JoinColumn({ name: 'atmosphere_team_id' })
  atmosphereTeam: MinistryTeam | null;
  @Column({
    name: 'atmosphere_team_other',
    type: 'varchar',
    length: 180,
    nullable: true,
  })
  atmosphereTeamOther: string | null;
  @Column({ name: 'atmosphere_responsible', type: 'varchar', length: 180 })
  atmosphereResponsible: string;
  @Column({ name: 'tadel_adults', type: 'int', default: 0 })
  tadelAdults: number;
  @Column({ name: 'tadel_kids', type: 'int', default: 0 }) tadelKids: number;
  @Column({ name: 'vehicles_cars', type: 'int', default: 0 })
  vehiclesCars: number;
  @Column({ name: 'vehicles_motos', type: 'int', default: 0 })
  vehiclesMotos: number;
  @Column({ name: 'vehicles_bikes', type: 'int', default: 0 })
  vehiclesBikes: number;
  @Column({
    name: 'vehicles_others',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  vehiclesOthers: string | null;
  @Column({ name: 'volunteers_atmosfera', type: 'int', default: 0 })
  volunteersAtmosfera: number;
  @Column({ name: 'volunteers_louvor', type: 'int', default: 0 })
  volunteersLouvor: number;
  @Column({ name: 'volunteers_midia', type: 'int', default: 0 })
  volunteersMiddia: number;
  @Column({ name: 'volunteers_danca', type: 'int', default: 0 })
  volunteersDanca: number;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'submitted_by_id' })
  submittedBy: User;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @DeleteDateColumn({ name: 'deleted_at' }) deletedAt: Date | null;
}
