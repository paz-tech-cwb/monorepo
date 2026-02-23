import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { Address } from '../../addresses/entities/address.entity';
import { UserAccount } from './account.entity';
import { Sector } from '../../sectors/entities/sector.entity';
import { LifeGroup } from '../../life-groups/entities/life-group.entity';
import { Course } from '../../courses/entities/course.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ name: 'phone_number', type: 'varchar', length: 15, nullable: true })
  phoneNumber: string | null;

  @ManyToOne(() => Address, { nullable: true })
  address: Address;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  picture: string | null;

  @ManyToOne(() => Role, { nullable: false, eager: true })
  role: Role;

  @ManyToOne(() => Sector, { nullable: true })
  sector: Sector | null;

  @ManyToOne(() => LifeGroup, { nullable: true })
  lifeGroup: LifeGroup | null;

  @ManyToMany(() => Course, { nullable: true })
  @JoinTable({
    name: 'user_courses',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'course_id', referencedColumnName: 'id' },
  })
  completedCourses: Course[];

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ name: 'membership_date', type: 'date', nullable: true })
  membershipDate: Date | null;

  @OneToMany(() => UserAccount, (userAccount) => userAccount.user, {
    nullable: true,
  })
  accounts: UserAccount[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
