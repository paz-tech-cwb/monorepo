import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  OneToMany,
  OneToOne,
  JoinTable,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { Address } from '../../addresses/entities/address.entity';
import { UserAccount } from './account.entity';
import { Sector } from '../../sectors/entities/sector.entity';
import { LifeGroup } from '../../life-groups/entities/life-group.entity';
import { Course } from '../../courses/entities/course.entity';
import { Area } from '../../areas/entities/area.entity';

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

  @ManyToMany(() => LifeGroup, (lifeGroup) => lifeGroup.users)
  @JoinTable({
    name: 'user_life_groups',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'life_group_id', referencedColumnName: 'id' },
  })
  lifeGroups: LifeGroup[];

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

  @OneToOne(() => Area, { nullable: true, eager: false })
  @JoinColumn()
  leadingArea: Area | null;

  @OneToOne(() => Sector, { nullable: true, eager: false })
  @JoinColumn()
  leadingSector: Sector | null;

  @OneToOne(() => LifeGroup, { nullable: true, eager: false })
  @JoinColumn()
  leadingLifeGroup: LifeGroup | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
