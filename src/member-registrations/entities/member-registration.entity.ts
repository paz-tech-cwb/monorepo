import { Column, CreateDateColumn, DeleteDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('member_registrations')
export class MemberRegistration {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 180 }) email: string;
  @Column({ name: 'full_name', type: 'varchar', length: 180 }) fullName: string;
  @Column({ name: 'birth_date', type: 'date' }) birthDate: string;
  @Column({ type: 'varchar', length: 32 }) phone: string;
  @Column({ type: 'varchar', length: 2 }) gender: string;
  @Column({ name: 'civil_state', type: 'varchar', length: 20 }) civilState: string;
  @Column({ type: 'varchar', length: 9, nullable: true }) cep: string | null;
  @Column({ type: 'varchar', length: 180, nullable: true }) street: string | null;
  @Column({ name: 'address_number', type: 'varchar', length: 30, nullable: true }) addressNumber: string | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) complement: string | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) neighborhood: string | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) city: string | null;
  @Column({ type: 'varchar', length: 2, nullable: true }) state: string | null;
  @Column({ type: 'text', nullable: true }) address: string | null;
  @Column({ name: 'sector_id', type: 'int' }) sectorId: number;
  @Column({ name: 'life_group_id', type: 'int', nullable: true }) lifeGroupId: number | null;
  @Column({ name: 'leader_id', type: 'int', nullable: true }) leaderId: number | null;
  @Column({ name: 'completed_courses', type: 'uuid', array: true, default: () => "'{}'" }) completedCourses: string[];
  @Column({ name: 'area_id', type: 'int', nullable: true }) areaId: number | null;
  @ManyToOne(() => User, { nullable: false }) submittedBy: User;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @DeleteDateColumn({ name: 'deleted_at' }) deletedAt: Date | null;
}
